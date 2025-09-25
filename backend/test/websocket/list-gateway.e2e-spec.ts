import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Socket, io as ioc } from 'socket.io-client';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import * as jwt from 'jsonwebtoken';

describe('ListGateway (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let clientSocket: Socket;
  let serverUrl: string;
  let testUser: any;
  let testList: any;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
    await app.listen(0); // Use random port

    const server = app.getHttpServer();
    const address = server.address();
    const port = typeof address === 'string' ? address : address?.port;
    serverUrl = `http://localhost:${port}`;
  });

  beforeEach(async () => {
    // Create test user
    testUser = await prismaService.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashedpassword',
        profile: {
          create: {
            fullName: 'Test User',
          },
        },
      },
      include: { profile: true },
    });

    // Create test list
    testList = await prismaService.list.create({
      data: {
        title: 'Test List',
        type: 'TODO',
        ownerId: testUser.id,
      },
    });

    // Generate JWT token
    authToken = jwt.sign(
      { sub: testUser.id, email: testUser.email },
      process.env.JWT_SECRET || 'test-secret',
    );

    // Create client socket
    clientSocket = ioc(`${serverUrl}/lists`, {
      auth: {
        token: authToken,
      },
      transports: ['websocket'],
    });

    return new Promise((resolve) => {
      clientSocket.on('connect', resolve);
    });
  });

  afterEach(async () => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }

    // Clean up test data
    await prismaService.listEvent.deleteMany({
      where: { listId: testList.id },
    });
    await prismaService.list.deleteMany({
      where: { ownerId: testUser.id },
    });
    await prismaService.profile.deleteMany({
      where: { userId: testUser.id },
    });
    await prismaService.user.deleteMany({
      where: { id: testUser.id },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication', () => {
    it('should connect with valid JWT token', (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    it('should reject connection with invalid token', (done) => {
      const invalidSocket = ioc(`${serverUrl}/lists`, {
        auth: {
          token: 'invalid-token',
        },
        transports: ['websocket'],
      });

      invalidSocket.on('connect_error', () => {
        invalidSocket.disconnect();
        done();
      });

      invalidSocket.on('connect', () => {
        invalidSocket.disconnect();
        done(new Error('Should not connect with invalid token'));
      });
    });
  });

  describe('joinList', () => {
    it('should successfully join a list', (done) => {
      clientSocket.emit('joinList', { listId: testList.id });

      clientSocket.on('joinedList', (data) => {
        expect(data).toEqual({
          listId: testList.id,
          message: 'Successfully joined list',
        });
        done();
      });

      clientSocket.on('error', (error) => {
        done(new Error(`Unexpected error: ${error.message}`));
      });
    });

    it('should reject joining non-existent list', (done) => {
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

    it('should reject joining list with invalid data', (done) => {
      clientSocket.emit('joinList', { invalidField: 'test' });

      clientSocket.on('validationError', (error) => {
        expect(error.message).toBe('Validation failed');
        done();
      });

      clientSocket.on('joinedList', () => {
        done(new Error('Should not join with invalid data'));
      });
    });
  });

  describe('leaveList', () => {
    beforeEach((done) => {
      // Join list first
      clientSocket.emit('joinList', { listId: testList.id });
      clientSocket.on('joinedList', () => done());
    });

    it('should successfully leave a list', (done) => {
      clientSocket.emit('leaveList', { listId: testList.id });

      clientSocket.on('leftList', (data) => {
        expect(data).toEqual({
          listId: testList.id,
          message: 'Successfully left list',
        });
        done();
      });

      clientSocket.on('error', (error) => {
        done(new Error(`Unexpected error: ${error.message}`));
      });
    });
  });

  describe('getActiveUsers', () => {
    beforeEach((done) => {
      // Join list first
      clientSocket.emit('joinList', { listId: testList.id });
      clientSocket.on('joinedList', () => done());
    });

    it('should return active users for a list', (done) => {
      clientSocket.emit('getActiveUsers', { listId: testList.id });

      clientSocket.on('activeUsers', (data) => {
        expect(data).toEqual({
          listId: testList.id,
          users: expect.arrayContaining([testUser.id]),
          count: expect.any(Number),
        });
        expect(data.count).toBeGreaterThan(0);
        done();
      });

      clientSocket.on('error', (error) => {
        done(new Error(`Unexpected error: ${error.message}`));
      });
    });
  });

  describe('heartbeat', () => {
    it('should respond to heartbeat with acknowledgment', (done) => {
      clientSocket.emit('heartbeat', { listId: testList.id });

      clientSocket.on('heartbeatAck', (data) => {
        expect(data).toHaveProperty('timestamp');
        expect(new Date(data.timestamp)).toBeInstanceOf(Date);
        done();
      });

      clientSocket.on('error', (error) => {
        done(new Error(`Unexpected error: ${error.message}`));
      });
    });

    it('should handle heartbeat without listId', (done) => {
      clientSocket.emit('heartbeat', {});

      clientSocket.on('heartbeatAck', (data) => {
        expect(data).toHaveProperty('timestamp');
        done();
      });

      clientSocket.on('error', (error) => {
        done(new Error(`Unexpected error: ${error.message}`));
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on joinList', (done) => {
      let joinAttempts = 0;
      let rateLimitHit = false;

      const attemptJoin = () => {
        if (joinAttempts >= 15) {
          // Exceed the 10 per minute limit
          if (!rateLimitHit) {
            done(new Error('Rate limit should have been triggered'));
          }
          return;
        }

        joinAttempts++;
        clientSocket.emit('joinList', { listId: testList.id });
        setTimeout(attemptJoin, 10); // Rapid requests
      };

      clientSocket.on('rateLimitExceeded', () => {
        rateLimitHit = true;
        done(); // Success - rate limit was enforced
      });

      clientSocket.on('joinedList', () => {
        // Continue attempting joins
      });

      attemptJoin();
    }, 10000); // 10 second timeout
  });

  describe('User Presence', () => {
    let secondClientSocket: Socket;

    beforeEach(() => {
      secondClientSocket = ioc(`${serverUrl}/lists`, {
        auth: {
          token: authToken,
        },
        transports: ['websocket'],
      });

      return new Promise((resolve) => {
        secondClientSocket.on('connect', resolve);
      });
    });

    afterEach(() => {
      if (secondClientSocket.connected) {
        secondClientSocket.disconnect();
      }
    });

    it('should broadcast user join events', (done) => {
      // First client joins
      clientSocket.emit('joinList', { listId: testList.id });

      clientSocket.on('joinedList', () => {
        // Second client should receive userJoined event when first client joins
        secondClientSocket.on('userJoined', (data) => {
          expect(data).toEqual({
            listId: testList.id,
            user: {
              id: testUser.id,
              email: testUser.email,
              fullName: testUser.profile.fullName,
            },
          });
          done();
        });

        // Second client joins the same list
        secondClientSocket.emit('joinList', { listId: testList.id });
      });
    });

    it('should broadcast user leave events', (done) => {
      // Both clients join first
      Promise.all([
        new Promise((resolve) => {
          clientSocket.emit('joinList', { listId: testList.id });
          clientSocket.on('joinedList', resolve);
        }),
        new Promise((resolve) => {
          secondClientSocket.emit('joinList', { listId: testList.id });
          secondClientSocket.on('joinedList', resolve);
        }),
      ]).then(() => {
        // Listen for leave event on second client
        secondClientSocket.on('userLeft', (data) => {
          expect(data).toEqual({
            listId: testList.id,
            user: {
              id: testUser.id,
              email: testUser.email,
              fullName: testUser.profile.fullName,
            },
          });
          done();
        });

        // First client leaves
        clientSocket.emit('leaveList', { listId: testList.id });
      });
    });
  });
});
