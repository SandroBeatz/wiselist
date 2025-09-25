import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Socket, io as ioc } from 'socket.io-client';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import * as jwt from 'jsonwebtoken';

describe('WebSocket Security (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let serverUrl: string;
  let testUser: any;
  let otherUser: any;
  let testList: any;
  let otherUserList: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
    await app.listen(0);

    const server = app.getHttpServer();
    const address = server.address();
    const port = typeof address === 'string' ? address : address?.port;
    serverUrl = `http://localhost:${port}`;

    // Create test users
    testUser = await prismaService.user.create({
      data: {
        email: 'testuser@example.com',
        password: 'hashedpassword',
        profile: {
          create: {
            fullName: 'Test User',
          },
        },
      },
      include: { profile: true },
    });

    otherUser = await prismaService.user.create({
      data: {
        email: 'otheruser@example.com',
        password: 'hashedpassword',
        profile: {
          create: {
            fullName: 'Other User',
          },
        },
      },
      include: { profile: true },
    });

    // Create test lists
    testList = await prismaService.list.create({
      data: {
        title: 'Test User List',
        type: 'TODO',
        ownerId: testUser.id,
      },
    });

    otherUserList = await prismaService.list.create({
      data: {
        title: 'Other User List',
        type: 'TODO',
        ownerId: otherUser.id,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prismaService.listEvent.deleteMany({});
    await prismaService.list.deleteMany({});
    await prismaService.profile.deleteMany({});
    await prismaService.user.deleteMany({});
    await app.close();
  });

  describe('Authentication Security', () => {
    it('should reject connections without token', (done) => {
      const socket = ioc(`${serverUrl}/lists`, {
        transports: ['websocket'],
      });

      socket.on('connect_error', (error) => {
        expect(error).toBeDefined();
        socket.disconnect();
        done();
      });

      socket.on('connect', () => {
        socket.disconnect();
        done(new Error('Should not connect without token'));
      });
    });

    it('should reject connections with malformed token', (done) => {
      const socket = ioc(`${serverUrl}/lists`, {
        auth: {
          token: 'malformed.token.here',
        },
        transports: ['websocket'],
      });

      socket.on('connect_error', () => {
        socket.disconnect();
        done();
      });

      socket.on('connect', () => {
        socket.disconnect();
        done(new Error('Should not connect with malformed token'));
      });
    });

    it('should reject connections with expired token', (done) => {
      const expiredToken = jwt.sign(
        {
          sub: testUser.id,
          email: testUser.email,
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        },
        process.env.JWT_SECRET || 'test-secret',
      );

      const socket = ioc(`${serverUrl}/lists`, {
        auth: {
          token: expiredToken,
        },
        transports: ['websocket'],
      });

      socket.on('connect_error', () => {
        socket.disconnect();
        done();
      });

      socket.on('connect', () => {
        socket.disconnect();
        done(new Error('Should not connect with expired token'));
      });
    });

    it('should reject connections with token for non-existent user', (done) => {
      const fakeToken = jwt.sign(
        {
          sub: '00000000-0000-0000-0000-000000000000',
          email: 'fake@example.com',
        },
        process.env.JWT_SECRET || 'test-secret',
      );

      const socket = ioc(`${serverUrl}/lists`, {
        auth: {
          token: fakeToken,
        },
        transports: ['websocket'],
      });

      socket.on('connect_error', () => {
        socket.disconnect();
        done();
      });

      socket.on('connect', () => {
        socket.disconnect();
        done(new Error('Should not connect with token for non-existent user'));
      });
    });
  });

  describe('Authorization Security', () => {
    let clientSocket: Socket;
    let authToken: string;

    beforeEach(() => {
      authToken = jwt.sign(
        { sub: testUser.id, email: testUser.email },
        process.env.JWT_SECRET || 'test-secret',
      );

      clientSocket = ioc(`${serverUrl}/lists`, {
        auth: { token: authToken },
        transports: ['websocket'],
      });

      return new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });
    });

    afterEach(() => {
      if (clientSocket.connected) {
        clientSocket.disconnect();
      }
    });

    it('should prevent joining lists owned by other users', (done) => {
      clientSocket.emit('joinList', { listId: otherUserList.id });

      clientSocket.on('error', (error) => {
        expect(error.message).toBe('List not found or access denied');
        done();
      });

      clientSocket.on('joinedList', () => {
        done(new Error("Should not join other user's list"));
      });
    });

    it('should prevent accessing non-existent lists', (done) => {
      const fakeListId = '00000000-0000-0000-0000-000000000000';

      clientSocket.emit('joinList', { listId: fakeListId });

      clientSocket.on('error', (error) => {
        expect(error.message).toBe('List not found or access denied');
        done();
      });

      clientSocket.on('joinedList', () => {
        done(new Error('Should not join non-existent list'));
      });
    });

    it('should prevent getActiveUsers for unauthorized lists', (done) => {
      clientSocket.emit('getActiveUsers', { listId: otherUserList.id });

      clientSocket.on('error', (error) => {
        expect(error).toBeDefined();
        done();
      });

      clientSocket.on('activeUsers', () => {
        done(new Error('Should not get active users for unauthorized list'));
      });
    });
  });

  describe('Input Validation Security', () => {
    let clientSocket: Socket;

    beforeEach(() => {
      const authToken = jwt.sign(
        { sub: testUser.id, email: testUser.email },
        process.env.JWT_SECRET || 'test-secret',
      );

      clientSocket = ioc(`${serverUrl}/lists`, {
        auth: { token: authToken },
        transports: ['websocket'],
      });

      return new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });
    });

    afterEach(() => {
      if (clientSocket.connected) {
        clientSocket.disconnect();
      }
    });

    it('should reject joinList with invalid UUID', (done) => {
      clientSocket.emit('joinList', { listId: 'invalid-uuid' });

      clientSocket.on('validationError', (error) => {
        expect(error.message).toBe('Validation failed');
        expect(error.errors).toContainEqual({
          property: 'listId',
          constraints: expect.any(Object),
        });
        done();
      });

      clientSocket.on('joinedList', () => {
        done(new Error('Should not join with invalid UUID'));
      });
    });

    it('should reject joinList with missing data', (done) => {
      clientSocket.emit('joinList', {});

      clientSocket.on('validationError', (error) => {
        expect(error.message).toBe('Validation failed');
        done();
      });

      clientSocket.on('joinedList', () => {
        done(new Error('Should not join with missing data'));
      });
    });

    it('should reject joinList with extra fields', (done) => {
      clientSocket.emit('joinList', {
        listId: testList.id,
        maliciousField: '<script>alert("xss")</script>',
      });

      // Should still work but malicious field should be ignored/validated out
      clientSocket.on('joinedList', (data) => {
        expect(data).not.toHaveProperty('maliciousField');
        done();
      });

      clientSocket.on('validationError', () => {
        // Also acceptable - validation rejected the extra field
        done();
      });
    });

    it('should sanitize heartbeat data', (done) => {
      clientSocket.emit('heartbeat', {
        listId: testList.id,
        maliciousScript: '<script>alert("xss")</script>',
      });

      clientSocket.on('heartbeatAck', (data) => {
        expect(data).not.toHaveProperty('maliciousScript');
        done();
      });

      clientSocket.on('validationError', () => {
        // Also acceptable - validation rejected malicious data
        done();
      });
    });
  });

  describe('Rate Limiting Security', () => {
    let clientSocket: Socket;

    beforeEach(() => {
      const authToken = jwt.sign(
        { sub: testUser.id, email: testUser.email },
        process.env.JWT_SECRET || 'test-secret',
      );

      clientSocket = ioc(`${serverUrl}/lists`, {
        auth: { token: authToken },
        transports: ['websocket'],
      });

      return new Promise((resolve) => {
        clientSocket.on('connect', resolve);
      });
    });

    afterEach(() => {
      if (clientSocket.connected) {
        clientSocket.disconnect();
      }
    });

    it('should enforce rate limits to prevent DoS attacks', (done) => {
      let requestCount = 0;
      let rateLimitTriggered = false;

      const sendRequests = () => {
        if (requestCount >= 50) {
          if (!rateLimitTriggered) {
            done(new Error('Rate limit should have been triggered'));
          }
          return;
        }

        requestCount++;
        clientSocket.emit('joinList', { listId: testList.id });
        setTimeout(sendRequests, 10); // Send requests rapidly
      };

      clientSocket.on('rateLimitExceeded', (error) => {
        expect(error.message).toBe('Rate limit exceeded');
        rateLimitTriggered = true;
        done();
      });

      clientSocket.on('joinedList', () => {
        // Continue sending requests
      });

      sendRequests();
    }, 10000);

    it('should apply different rate limits to different operations', (done) => {
      let heartbeatCount = 0;
      let heartbeatRateLimited = false;

      // Heartbeat has higher limit (120/min) than joinList (10/min)
      const sendHeartbeats = () => {
        if (heartbeatCount >= 130) {
          if (!heartbeatRateLimited) {
            done(new Error('Heartbeat rate limit should have been triggered'));
          }
          return;
        }

        heartbeatCount++;
        clientSocket.emit('heartbeat', { listId: testList.id });
        setTimeout(sendHeartbeats, 10);
      };

      clientSocket.on('rateLimitExceeded', () => {
        heartbeatRateLimited = true;
        done();
      });

      clientSocket.on('heartbeatAck', () => {
        // Continue sending heartbeats
      });

      sendHeartbeats();
    }, 15000);
  });

  describe('Data Leakage Prevention', () => {
    let userSocket: Socket;
    let otherSocket: Socket;

    beforeEach(async () => {
      const userToken = jwt.sign(
        { sub: testUser.id, email: testUser.email },
        process.env.JWT_SECRET || 'test-secret',
      );

      const otherToken = jwt.sign(
        { sub: otherUser.id, email: otherUser.email },
        process.env.JWT_SECRET || 'test-secret',
      );

      userSocket = ioc(`${serverUrl}/lists`, {
        auth: { token: userToken },
        transports: ['websocket'],
      });

      otherSocket = ioc(`${serverUrl}/lists`, {
        auth: { token: otherToken },
        transports: ['websocket'],
      });

      await Promise.all([
        new Promise((resolve) => userSocket.on('connect', resolve)),
        new Promise((resolve) => otherSocket.on('connect', resolve)),
      ]);
    });

    afterEach(() => {
      if (userSocket.connected) userSocket.disconnect();
      if (otherSocket.connected) otherSocket.disconnect();
    });

    it('should not leak user presence to unauthorized users', (done) => {
      let unauthorizedPresenceReceived = false;

      // Other user shouldn't receive presence updates for test user's list
      otherSocket.on('userJoined', (data) => {
        if (data.listId === testList.id) {
          unauthorizedPresenceReceived = true;
        }
      });

      userSocket.emit('joinList', { listId: testList.id });

      userSocket.on('joinedList', () => {
        // Wait a bit to see if unauthorized presence is leaked
        setTimeout(() => {
          expect(unauthorizedPresenceReceived).toBe(false);
          done();
        }, 1000);
      });
    });

    it('should not broadcast events to unauthorized users', (done) => {
      let unauthorizedEventReceived = false;

      // Other user shouldn't receive events for test user's list
      otherSocket.on('listEvent', (data) => {
        if (data.listId === testList.id) {
          unauthorizedEventReceived = true;
        }
      });

      userSocket.emit('joinList', { listId: testList.id });

      userSocket.on('joinedList', () => {
        // Simulate a list event
        setTimeout(() => {
          expect(unauthorizedEventReceived).toBe(false);
          done();
        }, 1000);
      });
    });
  });

  describe('Connection Security', () => {
    it('should handle malicious connection attempts gracefully', async () => {
      const maliciousPromises = [];

      // Try various malicious connection patterns
      for (let i = 0; i < 10; i++) {
        const maliciousPromise = new Promise((resolve) => {
          const maliciousSocket = ioc(`${serverUrl}/lists`, {
            auth: {
              token: `malicious-token-${i}`,
            },
            transports: ['websocket'],
            timeout: 1000,
          });

          maliciousSocket.on('connect_error', () => {
            maliciousSocket.disconnect();
            resolve('rejected');
          });

          maliciousSocket.on('connect', () => {
            maliciousSocket.disconnect();
            resolve('connected');
          });

          setTimeout(() => {
            maliciousSocket.disconnect();
            resolve('timeout');
          }, 2000);
        });

        maliciousPromises.push(maliciousPromise);
      }

      const results = await Promise.all(maliciousPromises);

      // All malicious connections should be rejected
      const rejectedCount = results.filter(
        (result) => result === 'rejected',
      ).length;
      expect(rejectedCount).toBe(10);
    });

    it('should not crash server with malformed WebSocket frames', (done) => {
      const authToken = jwt.sign(
        { sub: testUser.id, email: testUser.email },
        process.env.JWT_SECRET || 'test-secret',
      );

      const socket = ioc(`${serverUrl}/lists`, {
        auth: { token: authToken },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        // Send malformed data
        try {
          (socket as any).emit('malformed-event', {
            deeply: {
              nested: {
                malicious: {
                  payload: 'x'.repeat(10000), // Large payload
                  nullByte: '\0',
                  scriptTag: '<script>alert("xss")</script>',
                },
              },
            },
          });

          // Server should handle gracefully without crashing
          setTimeout(() => {
            socket.disconnect();
            done();
          }, 1000);
        } catch (error) {
          socket.disconnect();
          done();
        }
      });

      socket.on('error', () => {
        socket.disconnect();
        done(); // Error handling is acceptable
      });
    });
  });
});
