import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Socket, io as ioc } from 'socket.io-client';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { PerformanceService } from '../../src/monitoring/performance.service';
import * as jwt from 'jsonwebtoken';

interface PerformanceMetrics {
  connectionTime: number;
  joinListTime: number;
  heartbeatResponseTime: number;
  disconnectionTime: number;
}

describe('Concurrent Users Performance (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let performanceService: PerformanceService;
  let serverUrl: string;
  const testUsers: any[] = [];
  let testList: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    performanceService =
      moduleFixture.get<PerformanceService>(PerformanceService);

    await app.init();
    await app.listen(0);

    const server = app.getHttpServer();
    const address = server.address();
    const port = typeof address === 'string' ? address : address?.port;
    serverUrl = `http://localhost:${port}`;

    // Create test users
    for (let i = 0; i < 50; i++) {
      const user = await prismaService.user.create({
        data: {
          email: `test${i}@example.com`,
          password: 'hashedpassword',
          profile: {
            create: {
              fullName: `Test User ${i}`,
            },
          },
        },
        include: { profile: true },
      });
      testUsers.push(user);
    }

    // Create test list owned by first user
    testList = await prismaService.list.create({
      data: {
        title: 'Performance Test List',
        type: 'TODO',
        ownerId: testUsers[0].id,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prismaService.listEvent.deleteMany({
      where: { listId: testList.id },
    });
    await prismaService.list.deleteMany({
      where: { id: testList.id },
    });

    for (const user of testUsers) {
      await prismaService.profile.deleteMany({
        where: { userId: user.id },
      });
      await prismaService.user.deleteMany({
        where: { id: user.id },
      });
    }

    await app.close();
  });

  describe('Concurrent Connections', () => {
    it('should handle 50 concurrent connections', async () => {
      const connections: Socket[] = [];
      const connectionTimes: number[] = [];
      const connectionPromises: Promise<void>[] = [];

      // Create concurrent connections
      for (let i = 0; i < 50; i++) {
        const authToken = jwt.sign(
          { sub: testUsers[i].id, email: testUsers[i].email },
          process.env.JWT_SECRET || 'test-secret',
        );

        const connectionPromise = new Promise<void>((resolve) => {
          const startTime = Date.now();

          const socket = ioc(`${serverUrl}/lists`, {
            auth: { token: authToken },
            transports: ['websocket'],
          });

          socket.on('connect', () => {
            connectionTimes.push(Date.now() - startTime);
            connections.push(socket);
            resolve();
          });

          socket.on('connect_error', (error) => {
            console.error(`Connection ${i} failed:`, error);
            resolve();
          });
        });

        connectionPromises.push(connectionPromise);
      }

      // Wait for all connections
      await Promise.all(connectionPromises);

      // Performance assertions
      expect(connections.length).toBeGreaterThanOrEqual(45); // Allow 10% failure rate

      const avgConnectionTime =
        connectionTimes.reduce((sum, time) => sum + time, 0) /
        connectionTimes.length;
      expect(avgConnectionTime).toBeLessThan(1000); // Should connect within 1 second

      console.log(`Average connection time: ${avgConnectionTime}ms`);
      console.log(`Successful connections: ${connections.length}/50`);

      // Track performance metrics
      await performanceService.trackWebSocketConnection(
        'connect',
        'performance-test',
      );

      // Cleanup
      connections.forEach((socket) => {
        if (socket.connected) {
          socket.disconnect();
        }
      });
    }, 30000);
  });

  describe('Concurrent List Operations', () => {
    let sockets: Socket[] = [];

    beforeEach(async () => {
      // Create 20 connections for this test
      const connectionPromises = [];

      for (let i = 0; i < 20; i++) {
        const authToken = jwt.sign(
          { sub: testUsers[0].id, email: testUsers[0].email }, // All use same user for list access
          process.env.JWT_SECRET || 'test-secret',
        );

        const connectionPromise = new Promise<void>((resolve) => {
          const socket = ioc(`${serverUrl}/lists`, {
            auth: { token: authToken },
            transports: ['websocket'],
          });

          socket.on('connect', () => {
            sockets.push(socket);
            resolve();
          });
        });

        connectionPromises.push(connectionPromise);
      }

      await Promise.all(connectionPromises);
    });

    afterEach(() => {
      sockets.forEach((socket) => {
        if (socket.connected) {
          socket.disconnect();
        }
      });
      sockets = [];
    });

    it('should handle concurrent joinList operations', async () => {
      const joinPromises: Promise<number>[] = [];

      // All sockets try to join the same list simultaneously
      sockets.forEach((socket, index) => {
        const joinPromise = new Promise<number>((resolve) => {
          const startTime = Date.now();

          socket.emit('joinList', { listId: testList.id });

          socket.on('joinedList', () => {
            resolve(Date.now() - startTime);
          });

          socket.on('error', () => {
            resolve(-1); // Mark as failed
          });
        });

        joinPromises.push(joinPromise);
      });

      const joinTimes = await Promise.all(joinPromises);
      const successfulJoins = joinTimes.filter((time) => time > 0);

      expect(successfulJoins.length).toBeGreaterThanOrEqual(18); // Allow 10% failure rate

      const avgJoinTime =
        successfulJoins.reduce((sum, time) => sum + time, 0) /
        successfulJoins.length;
      expect(avgJoinTime).toBeLessThan(500); // Should join within 500ms

      console.log(`Average join time: ${avgJoinTime}ms`);
      console.log(
        `Successful joins: ${successfulJoins.length}/${sockets.length}`,
      );
    }, 15000);

    it('should handle concurrent heartbeats', async () => {
      // First, all sockets join the list
      const joinPromises = sockets.map((socket) => {
        return new Promise<void>((resolve) => {
          socket.emit('joinList', { listId: testList.id });
          socket.on('joinedList', () => resolve());
        });
      });

      await Promise.all(joinPromises);

      // Then send concurrent heartbeats
      const heartbeatPromises: Promise<number>[] = [];

      sockets.forEach((socket) => {
        const heartbeatPromise = new Promise<number>((resolve) => {
          const startTime = Date.now();

          socket.emit('heartbeat', { listId: testList.id });

          socket.on('heartbeatAck', () => {
            resolve(Date.now() - startTime);
          });
        });

        heartbeatPromises.push(heartbeatPromise);
      });

      const heartbeatTimes = await Promise.all(heartbeatPromises);
      const avgHeartbeatTime =
        heartbeatTimes.reduce((sum, time) => sum + time, 0) /
        heartbeatTimes.length;

      expect(avgHeartbeatTime).toBeLessThan(100); // Should respond within 100ms

      console.log(`Average heartbeat response time: ${avgHeartbeatTime}ms`);
    }, 10000);
  });

  describe('Memory and Resource Usage', () => {
    it('should not exceed memory limits under load', async () => {
      const initialMemory = process.memoryUsage();
      const connections: Socket[] = [];

      // Create many connections
      for (let i = 0; i < 100; i++) {
        const authToken = jwt.sign(
          {
            sub: testUsers[i % testUsers.length].id,
            email: testUsers[i % testUsers.length].email,
          },
          process.env.JWT_SECRET || 'test-secret',
        );

        const socket = ioc(`${serverUrl}/lists`, {
          auth: { token: authToken },
          transports: ['websocket'],
        });

        connections.push(socket);
      }

      // Wait for connections and perform operations
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const peakMemory = process.memoryUsage();
      const memoryIncrease = peakMemory.heapUsed - initialMemory.heapUsed;

      console.log(
        `Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`,
      );

      // Should not use more than 100MB additional memory for 100 connections
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

      // Track memory usage
      await performanceService.trackMemoryUsage();

      // Cleanup
      connections.forEach((socket) => {
        if (socket.connected) {
          socket.disconnect();
        }
      });

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const finalMemory = process.memoryUsage();
      console.log(
        `Final memory usage: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`,
      );
    }, 20000);
  });

  describe('Load Testing Scenarios', () => {
    it('should handle realistic user behavior patterns', async () => {
      const userCount = 30;
      const connections: Socket[] = [];
      const metrics: PerformanceMetrics[] = [];

      // Create user connections with staggered timing
      for (let i = 0; i < userCount; i++) {
        const authToken = jwt.sign(
          { sub: testUsers[i].id, email: testUsers[i].email },
          process.env.JWT_SECRET || 'test-secret',
        );

        const startTime = Date.now();
        const socket = ioc(`${serverUrl}/lists`, {
          auth: { token: authToken },
          transports: ['websocket'],
        });

        const userMetrics: Partial<PerformanceMetrics> = {};

        socket.on('connect', async () => {
          userMetrics.connectionTime = Date.now() - startTime;
          connections.push(socket);

          // Simulate user behavior: join list, send heartbeats, leave
          const joinStartTime = Date.now();
          socket.emit('joinList', { listId: testList.id });

          socket.on('joinedList', async () => {
            userMetrics.joinListTime = Date.now() - joinStartTime;

            // Send periodic heartbeats
            const heartbeatInterval = setInterval(() => {
              const heartbeatStart = Date.now();
              socket.emit('heartbeat', { listId: testList.id });

              socket.on('heartbeatAck', () => {
                userMetrics.heartbeatResponseTime = Date.now() - heartbeatStart;
              });
            }, 5000);

            // Leave after 10 seconds
            setTimeout(() => {
              clearInterval(heartbeatInterval);
              const disconnectStart = Date.now();

              socket.on('disconnect', () => {
                userMetrics.disconnectionTime = Date.now() - disconnectStart;
                metrics.push(userMetrics as PerformanceMetrics);
              });

              socket.disconnect();
            }, 10000);
          });
        });

        // Stagger connections
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Wait for test completion
      await new Promise((resolve) => setTimeout(resolve, 15000));

      // Analyze metrics
      const avgConnectionTime =
        metrics.reduce((sum, m) => sum + (m.connectionTime || 0), 0) /
        metrics.length;
      const avgJoinTime =
        metrics.reduce((sum, m) => sum + (m.joinListTime || 0), 0) /
        metrics.length;

      expect(avgConnectionTime).toBeLessThan(1000);
      expect(avgJoinTime).toBeLessThan(500);

      console.log('Performance Test Results:');
      console.log(`- Users: ${userCount}`);
      console.log(`- Avg Connection Time: ${avgConnectionTime.toFixed(2)}ms`);
      console.log(`- Avg Join Time: ${avgJoinTime.toFixed(2)}ms`);
      console.log(`- Completed Scenarios: ${metrics.length}`);

      // Cleanup remaining connections
      connections.forEach((socket) => {
        if (socket.connected) {
          socket.disconnect();
        }
      });
    }, 30000);
  });
});
