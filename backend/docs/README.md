# Wiselist API Documentation

This directory contains comprehensive documentation for the Wiselist API, a NestJS-based real-time collaborative list management application.

## Documentation Index

### 📚 Core Documentation
- **[API Documentation](./API.md)** - Complete REST API and WebSocket endpoint documentation
- **[WebSocket Events](./WEBSOCKET_EVENTS.md)** - Detailed WebSocket event specifications and examples
- **[Deployment & Monitoring](./DEPLOYMENT_MONITORING.md)** - Production deployment and monitoring guide

### 🚀 Quick Start
1. **Setup**: Follow the environment setup in [Deployment Guide](./DEPLOYMENT_MONITORING.md#environment-setup)
2. **API Reference**: Check [API Documentation](./API.md) for available endpoints
3. **Real-time Features**: Learn WebSocket events in [WebSocket Events](./WEBSOCKET_EVENTS.md)

### 🏗️ Architecture Overview

The Wiselist API implements a modern, scalable architecture with:

- **Real-time Collaboration**: WebSocket-based real-time updates using Socket.io
- **Event Sourcing**: Complete audit trail with conflict resolution
- **Multi-layer Caching**: Redis and memory caching for optimal performance  
- **Security**: JWT authentication, rate limiting, and input validation
- **Monitoring**: Built-in health checks and performance metrics

### 🔧 Key Features

#### Authentication & Security
- JWT-based authentication with multiple providers (Email, Google, Apple)
- Rate limiting and DoS protection
- Input validation and sanitization
- Secure WebSocket connections

#### Real-time Collaboration
- Live list editing with conflict resolution
- User presence tracking
- Real-time notifications
- Event-driven architecture

#### Performance & Scalability
- Redis caching with intelligent TTL policies
- Database connection pooling
- Horizontal scaling support
- Performance monitoring and metrics

### 📋 API Quick Reference

#### Core Endpoints
- `GET /api/lists` - Get user's lists
- `GET /api/lists/:id` - Get list details with items
- `POST /api/lists` - Create new list
- `PUT /api/lists/:id` - Update list
- `DELETE /api/lists/:id` - Delete list
- `POST /api/lists/:id/sync` - Sync with differential updates

#### WebSocket Events
- `joinList` - Join list room for real-time updates
- `leaveList` - Leave list room
- `heartbeat` - Maintain connection and presence
- `getActiveUsers` - Get active users in list

#### Monitoring
- `GET /api/monitoring/health` - Health check
- `GET /api/monitoring/metrics` - Performance metrics
- `GET /api/cache/stats` - Cache statistics

### 🔍 Documentation Details

#### [API Documentation](./API.md)
Complete reference for all REST endpoints and WebSocket events including:
- Authentication flows
- Request/response schemas
- Error handling
- Rate limiting policies
- Event sourcing patterns

#### [WebSocket Events](./WEBSOCKET_EVENTS.md) 
Detailed WebSocket documentation covering:
- Connection establishment
- Event specifications
- Real-time collaboration patterns
- Security considerations
- Rate limiting and error handling

#### [Deployment & Monitoring](./DEPLOYMENT_MONITORING.md)
Production deployment guide including:
- Environment setup and configuration
- Docker and Kubernetes deployment
- Database and Redis optimization  
- Monitoring and observability
- Performance tuning
- Troubleshooting guides

### 🧪 Testing

The API includes comprehensive test coverage:
- **Unit Tests**: Service and gateway logic testing
- **Integration Tests**: WebSocket functionality testing  
- **End-to-End Tests**: Complete workflow testing
- **Performance Tests**: Concurrent user load testing
- **Security Tests**: Authentication and authorization testing

Run tests with:
```bash
yarn test        # Unit tests
yarn test:e2e    # End-to-end tests
yarn test:cov    # Coverage report
```

### 🎯 Development Guidelines

When working with this API:

1. **Follow the Architecture**: Use event sourcing for data changes
2. **Implement Security**: Always validate inputs and check permissions
3. **Optimize Performance**: Leverage caching and use efficient queries
4. **Monitor Health**: Use built-in monitoring endpoints
5. **Test Thoroughly**: Write tests for new features

### 🔗 Related Files

- `../CLAUDE.md` - Project overview and commands
- `../RAILWAY_DEPLOYMENT.md` - Railway-specific deployment guide
- `../prisma/schema.prisma` - Database schema
- `../src/` - Source code directory

### 📞 Support

For issues or questions:
1. Check the [Troubleshooting](./DEPLOYMENT_MONITORING.md#troubleshooting) section
2. Review relevant documentation sections
3. Check application logs for error details
4. Verify environment configuration

---

**Last Updated**: January 2025  
**API Version**: 1.0.0  
**NestJS Version**: 10.4.20