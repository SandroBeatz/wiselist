# 🔧 Backend Sync Implementation Guide (NestJS + Prisma)

## Оглавление

- [Введение](#введение)
- [Архитектура](#архитектура)
- [Database Schema](#database-schema)
- [DTOs и Types](#dtos-и-types)
- [Sync Endpoint Implementation](#sync-endpoint-implementation)
- [Operational Transform Logic](#operational-transform-logic)
- [Security & Validation](#security--validation)
- [Testing](#testing)
- [Performance Optimization](#performance-optimization)
- [Migration Guide](#migration-guide)

---

## Введение

Этот документ описывает backend имплементацию для поддержки offline-first архитектуры с синхронизацией и разрешением конфликтов.

### Цели Backend

- ✅ Принимать batch операции от клиента
- ✅ Применять операции с проверкой версий
- ✅ Разрешать конфликты через OT
- ✅ Возвращать актуальное состояние данных
- ✅ Обеспечивать безопасность и валидацию

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Request                         │
│                   POST /lists/sync                           │
│  {                                                           │
│    listOperations: [...],                                   │
│    itemOperations: [...]                                    │
│  }                                                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    SyncController                            │
│  - Validate JWT token                                       │
│  - Extract user ID                                          │
│  - Pass to service layer                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     SyncService                              │
│  1. Process list operations                                 │
│  2. Process item operations                                 │
│  3. Detect conflicts (version mismatch)                     │
│  4. Apply OT resolution                                     │
│  5. Return updated state                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                        │
│                    (via Prisma)                              │
│  - Lists table with version field                           │
│  - ListItems table with version field                       │
│  - Optimistic locking on UPDATE                             │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Response                                 │
│  {                                                           │
│    lists: [...],         // Updated lists                   │
│    items: [...],         // Updated items                   │
│    conflicts: {          // Detected conflicts              │
│      listIds: [...],                                        │
│      itemIds: [...]                                         │
│    },                                                        │
│    serverTimestamp: 1234567890                              │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Обновление Prisma Schema

**Файл:** `backend/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User model (существующая)
model User {
  id            String      @id @default(uuid())
  email         String      @unique
  password      String?
  provider      Provider    @default(EMAIL)
  googleId      String?     @unique
  appleId       String?     @unique
  isSubscribed  Boolean     @default(false)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  profile       Profile?
  lists         List[]      @relation("OwnedLists")
  sharedLists   ListShare[]

  @@index([email])
  @@index([googleId])
  @@index([appleId])
}

model Profile {
  id                    String   @id @default(uuid())
  userId                String   @unique
  fullName              String
  avatar                String?
  notificationsEnabled  Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

// 🆕 Обновленная модель List с версионированием
model List {
  id        String      @id @default(uuid())
  title     String
  type      ListType    @default(SHOPPING)
  ownerId   String
  version   Int         @default(0)  // 🆕 Версия для синхронизации
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  owner     User        @relation("OwnedLists", fields: [ownerId], references: [id], onDelete: Cascade)
  items     ListItem[]
  shares    ListShare[]

  @@index([ownerId])
  @@index([version])
}

// 🆕 Обновленная модель ListItem с версионированием
model ListItem {
  id        String   @id @default(uuid())
  listId    String
  content   String
  checked   Boolean  @default(false)
  version   Int      @default(0)  // 🆕 Версия для синхронизации
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  list      List     @relation(fields: [listId], references: [id], onDelete: Cascade)

  @@index([listId])
  @@index([version])
}

// Sharing model
model ListShare {
  id        String   @id @default(uuid())
  listId    String
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  list      List     @relation(fields: [listId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([listId, userId])
  @@index([listId])
  @@index([userId])
}

enum ListType {
  SHOPPING
  TODO
  OTHER
}

enum Provider {
  EMAIL
  GOOGLE
  APPLE
}
```

### Migration

**Создание миграции:**

```bash
cd backend
npx prisma migrate dev --name add_version_field
```

**Файл миграции:** `backend/prisma/migrations/XXX_add_version_field/migration.sql`

```sql
-- Add version column to lists table
ALTER TABLE "List" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

-- Add version column to list_items table
ALTER TABLE "ListItem" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

-- Create indexes for version columns
CREATE INDEX "List_version_idx" ON "List"("version");
CREATE INDEX "ListItem_version_idx" ON "ListItem"("version");

-- Update existing records to have version 1
UPDATE "List" SET "version" = 1;
UPDATE "ListItem" SET "version" = 1;
```

**Применение миграции:**

```bash
npx prisma migrate deploy
npx prisma generate
```

---

## DTOs и Types

### Sync DTOs

**Файл:** `backend/src/lists/dto/sync.dto.ts`

```typescript
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum OperationType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export class ListOperationDto {
  @ApiProperty({ description: 'Entity ID (UUID)' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ enum: OperationType })
  @IsEnum(OperationType)
  type: OperationType;

  @ApiProperty({ description: 'Client version of the entity' })
  @IsNumber()
  version: number;

  @ApiProperty({ description: 'Timestamp when operation was created' })
  @IsNumber()
  timestamp: number;

  @ApiProperty({ description: 'Operation data', required: false })
  @IsOptional()
  @IsObject()
  data?: {
    title?: string;
    type?: 'SHOPPING' | 'TODO' | 'OTHER';
  };
}

export class ListItemOperationDto {
  @ApiProperty({ description: 'Item ID (UUID)' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'List ID this item belongs to' })
  @IsString()
  @IsNotEmpty()
  listId: string;

  @ApiProperty({ enum: OperationType })
  @IsEnum(OperationType)
  type: OperationType;

  @ApiProperty({ description: 'Client version of the item' })
  @IsNumber()
  version: number;

  @ApiProperty({ description: 'Timestamp when operation was created' })
  @IsNumber()
  timestamp: number;

  @ApiProperty({ description: 'Operation data', required: false })
  @IsOptional()
  @IsObject()
  data?: {
    content?: string;
    checked?: boolean;
  };
}

export class SyncRequestDto {
  @ApiProperty({ type: [ListOperationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ListOperationDto)
  listOperations: ListOperationDto[];

  @ApiProperty({ type: [ListItemOperationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ListItemOperationDto)
  itemOperations: ListItemOperationDto[];

  @ApiProperty({ description: 'Last sync timestamp from client', required: false })
  @IsOptional()
  @IsNumber()
  lastSyncTimestamp?: number;
}

export class ConflictDto {
  @ApiProperty({ type: [String], description: 'List IDs with conflicts' })
  listIds: string[];

  @ApiProperty({ type: [String], description: 'Item IDs with conflicts' })
  itemIds: string[];
}

export class SyncResponseDto {
  @ApiProperty({ description: 'All user lists with relations' })
  lists: any[];

  @ApiProperty({ description: 'All list items' })
  items: any[];

  @ApiProperty({ type: ConflictDto })
  conflicts: ConflictDto;

  @ApiProperty({ description: 'Server timestamp when sync completed' })
  serverTimestamp: number;
}
```

---

## Sync Endpoint Implementation

### Controller

**Файл:** `backend/src/lists/lists.controller.ts`

```typescript
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ListsService } from './lists.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SyncRequestDto, SyncResponseDto } from './dto/sync.dto';

@ApiTags('lists')
@Controller('lists')
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync lists and items',
    description: 'Synchronize client operations with server, resolve conflicts, and return updated state',
  })
  @ApiResponse({
    status: 200,
    description: 'Sync completed successfully',
    type: SyncResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async sync(
    @Req() req,
    @Body() syncDto: SyncRequestDto,
  ): Promise<SyncResponseDto> {
    const userId = req.user.id;
    return this.listsService.syncLists(userId, syncDto);
  }

  // ... other endpoints (getAll, create, update, delete, etc.)
}
```

### Service

**Файл:** `backend/src/lists/lists.service.ts`

```typescript
import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SyncRequestDto,
  SyncResponseDto,
  ListOperationDto,
  ListItemOperationDto,
  OperationType,
  ConflictDto,
} from './dto/sync.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ListsService {
  private readonly logger = new Logger(ListsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Main sync method - processes all operations and returns updated state
   */
  async syncLists(userId: string, syncDto: SyncRequestDto): Promise<SyncResponseDto> {
    this.logger.log(`Syncing for user ${userId}: ${syncDto.listOperations.length} list ops, ${syncDto.itemOperations.length} item ops`);

    const conflicts: ConflictDto = {
      listIds: [],
      itemIds: [],
    };

    // Use transaction to ensure atomicity
    await this.prisma.$transaction(async (tx) => {
      // Process list operations
      for (const op of syncDto.listOperations) {
        await this.processListOperation(userId, op, conflicts, tx);
      }

      // Process item operations
      for (const op of syncDto.itemOperations) {
        await this.processItemOperation(userId, op, conflicts, tx);
      }
    });

    // Fetch updated data
    const lists = await this.prisma.list.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { shares: { some: { userId } } },
        ],
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
        owner: {
          include: {
            profile: true,
          },
        },
        shares: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Extract all items
    const items = lists.flatMap((list) => list.items);

    this.logger.log(`Sync completed. Conflicts: ${conflicts.listIds.length} lists, ${conflicts.itemIds.length} items`);

    return {
      lists,
      items,
      conflicts,
      serverTimestamp: Date.now(),
    };
  }

  /**
   * Process a single list operation
   */
  private async processListOperation(
    userId: string,
    op: ListOperationDto,
    conflicts: ConflictDto,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    this.logger.debug(`Processing list operation: ${op.type} ${op.id}`);

    const existing = await tx.list.findUnique({
      where: { id: op.id },
    });

    switch (op.type) {
      case OperationType.CREATE:
        await this.handleListCreate(userId, op, existing, tx);
        break;

      case OperationType.UPDATE:
        await this.handleListUpdate(userId, op, existing, conflicts, tx);
        break;

      case OperationType.DELETE:
        await this.handleListDelete(userId, op, existing, tx);
        break;
    }
  }

  /**
   * Handle CREATE operation for list
   */
  private async handleListCreate(
    userId: string,
    op: ListOperationDto,
    existing: any,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (existing) {
      this.logger.debug(`List ${op.id} already exists, skipping CREATE`);
      return;
    }

    if (!op.data?.title) {
      this.logger.warn(`CREATE operation missing title for list ${op.id}`);
      return;
    }

    await tx.list.create({
      data: {
        id: op.id,
        title: op.data.title,
        type: op.data.type || 'SHOPPING',
        ownerId: userId,
        version: 1,
      },
    });

    this.logger.debug(`Created list ${op.id}`);
  }

  /**
   * Handle UPDATE operation for list with conflict detection
   */
  private async handleListUpdate(
    userId: string,
    op: ListOperationDto,
    existing: any,
    conflicts: ConflictDto,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (!existing) {
      this.logger.warn(`List ${op.id} not found for UPDATE`);
      return;
    }

    // Check permissions
    const hasAccess = await this.checkListAccess(userId, op.id, tx);
    if (!hasAccess) {
      this.logger.warn(`User ${userId} has no access to list ${op.id}`);
      throw new ForbiddenException('No access to this list');
    }

    // Version conflict detection
    if (existing.version !== op.version) {
      this.logger.warn(
        `Version conflict for list ${op.id}: client=${op.version}, server=${existing.version}`,
      );

      // Apply Operational Transform (Last Write Wins by timestamp)
      const shouldApplyClientUpdate = this.resolveListConflict(op, existing);

      if (!shouldApplyClientUpdate) {
        conflicts.listIds.push(op.id);
        this.logger.debug(`Server wins for list ${op.id}`);
        return;
      }

      this.logger.debug(`Client wins for list ${op.id}`);
    }

    // Apply update with version increment
    await tx.list.update({
      where: { id: op.id },
      data: {
        ...op.data,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    this.logger.debug(`Updated list ${op.id}, version incremented`);
  }

  /**
   * Handle DELETE operation for list
   */
  private async handleListDelete(
    userId: string,
    op: ListOperationDto,
    existing: any,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (!existing) {
      this.logger.debug(`List ${op.id} already deleted`);
      return;
    }

    // Only owner can delete
    if (existing.ownerId !== userId) {
      this.logger.warn(`User ${userId} tried to delete list ${op.id} owned by ${existing.ownerId}`);
      throw new ForbiddenException('Only owner can delete list');
    }

    // Cascade delete will handle items and shares
    await tx.list.delete({
      where: { id: op.id },
    });

    this.logger.debug(`Deleted list ${op.id}`);
  }

  /**
   * Process a single item operation
   */
  private async processItemOperation(
    userId: string,
    op: ListItemOperationDto,
    conflicts: ConflictDto,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    this.logger.debug(`Processing item operation: ${op.type} ${op.id}`);

    const existing = await tx.listItem.findUnique({
      where: { id: op.id },
      include: { list: true },
    });

    switch (op.type) {
      case OperationType.CREATE:
        await this.handleItemCreate(userId, op, existing, tx);
        break;

      case OperationType.UPDATE:
        await this.handleItemUpdate(userId, op, existing, conflicts, tx);
        break;

      case OperationType.DELETE:
        await this.handleItemDelete(userId, op, existing, tx);
        break;
    }
  }

  /**
   * Handle CREATE operation for item
   */
  private async handleItemCreate(
    userId: string,
    op: ListItemOperationDto,
    existing: any,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (existing) {
      this.logger.debug(`Item ${op.id} already exists, skipping CREATE`);
      return;
    }

    if (!op.data?.content) {
      this.logger.warn(`CREATE operation missing content for item ${op.id}`);
      return;
    }

    // Check list access
    const hasAccess = await this.checkListAccess(userId, op.listId, tx);
    if (!hasAccess) {
      throw new ForbiddenException('No access to this list');
    }

    await tx.listItem.create({
      data: {
        id: op.id,
        listId: op.listId,
        content: op.data.content,
        checked: op.data.checked || false,
        version: 1,
      },
    });

    this.logger.debug(`Created item ${op.id}`);
  }

  /**
   * Handle UPDATE operation for item with conflict detection
   */
  private async handleItemUpdate(
    userId: string,
    op: ListItemOperationDto,
    existing: any,
    conflicts: ConflictDto,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (!existing) {
      this.logger.warn(`Item ${op.id} not found for UPDATE`);
      return;
    }

    // Check list access
    const hasAccess = await this.checkListAccess(userId, existing.listId, tx);
    if (!hasAccess) {
      throw new ForbiddenException('No access to this list');
    }

    // Version conflict detection
    if (existing.version !== op.version) {
      this.logger.warn(
        `Version conflict for item ${op.id}: client=${op.version}, server=${existing.version}`,
      );

      const shouldApplyClientUpdate = this.resolveItemConflict(op, existing);

      if (!shouldApplyClientUpdate) {
        conflicts.itemIds.push(op.id);
        this.logger.debug(`Server wins for item ${op.id}`);
        return;
      }

      this.logger.debug(`Client wins for item ${op.id}`);
    }

    // Apply update with version increment
    await tx.listItem.update({
      where: { id: op.id },
      data: {
        ...op.data,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    this.logger.debug(`Updated item ${op.id}, version incremented`);
  }

  /**
   * Handle DELETE operation for item
   */
  private async handleItemDelete(
    userId: string,
    op: ListItemOperationDto,
    existing: any,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (!existing) {
      this.logger.debug(`Item ${op.id} already deleted`);
      return;
    }

    // Check list access
    const hasAccess = await this.checkListAccess(userId, existing.listId, tx);
    if (!hasAccess) {
      throw new ForbiddenException('No access to this list');
    }

    await tx.listItem.delete({
      where: { id: op.id },
    });

    this.logger.debug(`Deleted item ${op.id}`);
  }

  /**
   * Check if user has access to a list (owner or shared)
   */
  private async checkListAccess(
    userId: string,
    listId: string,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    const list = await tx.list.findFirst({
      where: {
        id: listId,
        OR: [
          { ownerId: userId },
          { shares: { some: { userId } } },
        ],
      },
    });

    return !!list;
  }

  /**
   * Resolve list conflict using Last Write Wins strategy
   */
  private resolveListConflict(clientOp: ListOperationDto, serverData: any): boolean {
    const clientTimestamp = clientOp.timestamp;
    const serverTimestamp = new Date(serverData.updatedAt).getTime();

    // Last Write Wins
    return clientTimestamp > serverTimestamp;
  }

  /**
   * Resolve item conflict using Last Write Wins strategy
   */
  private resolveItemConflict(clientOp: ListItemOperationDto, serverData: any): boolean {
    const clientTimestamp = clientOp.timestamp;
    const serverTimestamp = new Date(serverData.updatedAt).getTime();

    // Last Write Wins
    return clientTimestamp > serverTimestamp;
  }

  // ... other methods (getAll, create, update, delete, etc.)
}
```

---

## Operational Transform Logic

### Advanced OT Service (опциональный)

Для более сложных сценариев можно создать отдельный сервис:

**Файл:** `backend/src/lists/ot.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ListOperationDto, ListItemOperationDto, OperationType } from './dto/sync.dto';

interface ConflictResolutionResult {
  shouldApply: boolean;
  transformedData?: any;
  reason?: string;
}

@Injectable()
export class OperationalTransformService {
  private readonly logger = new Logger(OperationalTransformService.name);

  /**
   * Resolve conflict for list update
   */
  resolveListConflict(
    clientOp: ListOperationDto,
    serverData: any,
  ): ConflictResolutionResult {
    // Strategy 1: Last Write Wins based on timestamp
    const clientTime = clientOp.timestamp;
    const serverTime = new Date(serverData.updatedAt).getTime();

    if (clientTime > serverTime) {
      return {
        shouldApply: true,
        transformedData: clientOp.data,
        reason: 'Client operation is newer',
      };
    }

    return {
      shouldApply: false,
      reason: 'Server data is newer',
    };
  }

  /**
   * Resolve conflict for item update
   * Можно использовать более сложную логику для разных полей
   */
  resolveItemConflict(
    clientOp: ListItemOperationDto,
    serverData: any,
  ): ConflictResolutionResult {
    const clientTime = clientOp.timestamp;
    const serverTime = new Date(serverData.updatedAt).getTime();

    // Особая логика для checked field
    // Если конфликт только в checked - можно применить клиентскую версию
    if (clientOp.data?.checked !== undefined && clientOp.data?.content === undefined) {
      return {
        shouldApply: true,
        transformedData: {
          checked: clientOp.data.checked,
          // Сохраняем серверный content
          content: serverData.content,
        },
        reason: 'Checkbox toggle has priority',
      };
    }

    // Для других случаев - Last Write Wins
    if (clientTime > serverTime) {
      return {
        shouldApply: true,
        transformedData: clientOp.data,
        reason: 'Client operation is newer',
      };
    }

    return {
      shouldApply: false,
      reason: 'Server data is newer',
    };
  }

  /**
   * Field-level merge для более точного разрешения конфликтов
   */
  mergeFields(
    clientData: Record<string, any>,
    serverData: Record<string, any>,
    clientTime: number,
    serverTime: number,
  ): Record<string, any> {
    const result = { ...serverData };

    // Для каждого поля в клиентских данных
    for (const [key, value] of Object.entries(clientData)) {
      // Если значение отличается от серверного
      if (value !== serverData[key]) {
        // Применяем Last Write Wins для каждого поля
        if (clientTime > serverTime) {
          result[key] = value;
          this.logger.debug(`Field '${key}' merged from client`);
        } else {
          this.logger.debug(`Field '${key}' kept from server`);
        }
      }
    }

    return result;
  }

  /**
   * Трансформация операций (для более сложных случаев)
   * Используется когда нужно преобразовать операцию перед применением
   */
  transformOperation(
    clientOp: any,
    serverOps: any[],
  ): any {
    // Пример: если сервер удалил список, а клиент пытается обновить
    // Можно преобразовать UPDATE в CREATE

    // Пример: если два клиента добавили items в одну позицию
    // Можно изменить позицию одного из них

    // Для базовой версии - просто возвращаем оригинальную операцию
    return clientOp;
  }
}
```

---

## Security & Validation

### Guards и Middleware

**JWT Auth Guard** (уже существует):

```typescript
// backend/src/auth/guards/jwt-auth.guard.ts

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
```

### Request Validation

Все DTOs уже используют `class-validator` decorators для валидации.

**Дополнительная валидация:**

```typescript
// backend/src/lists/validators/sync.validator.ts

import { Injectable } from '@nestjs/common';
import { SyncRequestDto } from '../dto/sync.dto';

@Injectable()
export class SyncValidator {
  /**
   * Validate sync request before processing
   */
  validateSyncRequest(syncDto: SyncRequestDto): string[] {
    const errors: string[] = [];

    // Check operation count limits
    const totalOps = syncDto.listOperations.length + syncDto.itemOperations.length;
    if (totalOps > 1000) {
      errors.push('Too many operations in single sync request (max 1000)');
    }

    // Validate operation timestamps
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    for (const op of [...syncDto.listOperations, ...syncDto.itemOperations]) {
      if (op.timestamp > now + 60000) {
        errors.push(`Operation ${op.id} has future timestamp`);
      }
      if (op.timestamp < now - maxAge) {
        errors.push(`Operation ${op.id} is too old (max 7 days)`);
      }
    }

    return errors;
  }
}
```

### Rate Limiting

```typescript
// backend/src/lists/lists.controller.ts

import { Throttle } from '@nestjs/throttler';

@Controller('lists')
export class ListsController {
  @Post('sync')
  @UseGuards(JwtAuthGuard)
  @Throttle(10, 60) // Max 10 sync requests per minute
  async sync(@Req() req, @Body() syncDto: SyncRequestDto) {
    // ...
  }
}
```

---

## Testing

### Unit Tests

**Файл:** `backend/src/lists/__tests__/lists.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ListsService } from '../lists.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationType } from '../dto/sync.dto';

describe('ListsService - Sync', () => {
  let service: ListsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    list: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    listItem: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ListsService>(ListsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncLists', () => {
    it('should create new list from CREATE operation', async () => {
      const userId = 'user-1';
      const syncDto = {
        listOperations: [
          {
            id: 'list-1',
            type: OperationType.CREATE,
            version: 0,
            timestamp: Date.now(),
            data: { title: 'New List', type: 'SHOPPING' },
          },
        ],
        itemOperations: [],
      };

      mockPrismaService.list.findUnique.mockResolvedValue(null);
      mockPrismaService.list.findMany.mockResolvedValue([]);

      await service.syncLists(userId, syncDto);

      expect(mockPrismaService.list.create).toHaveBeenCalledWith({
        data: {
          id: 'list-1',
          title: 'New List',
          type: 'SHOPPING',
          ownerId: userId,
          version: 1,
        },
      });
    });

    it('should update list when versions match', async () => {
      const userId = 'user-1';
      const syncDto = {
        listOperations: [
          {
            id: 'list-1',
            type: OperationType.UPDATE,
            version: 5,
            timestamp: Date.now(),
            data: { title: 'Updated Title' },
          },
        ],
        itemOperations: [],
      };

      const existingList = {
        id: 'list-1',
        version: 5,
        ownerId: userId,
        updatedAt: new Date(),
      };

      mockPrismaService.list.findUnique.mockResolvedValue(existingList);
      mockPrismaService.list.findFirst.mockResolvedValue(existingList);
      mockPrismaService.list.findMany.mockResolvedValue([]);

      await service.syncLists(userId, syncDto);

      expect(mockPrismaService.list.update).toHaveBeenCalled();
    });

    it('should detect conflict when versions differ', async () => {
      const userId = 'user-1';
      const now = Date.now();

      const syncDto = {
        listOperations: [
          {
            id: 'list-1',
            type: OperationType.UPDATE,
            version: 5,
            timestamp: now - 10000, // Older
            data: { title: 'Client Update' },
          },
        ],
        itemOperations: [],
      };

      const existingList = {
        id: 'list-1',
        version: 6,
        ownerId: userId,
        updatedAt: new Date(now), // Newer
      };

      mockPrismaService.list.findUnique.mockResolvedValue(existingList);
      mockPrismaService.list.findFirst.mockResolvedValue(existingList);
      mockPrismaService.list.findMany.mockResolvedValue([]);

      const result = await service.syncLists(userId, syncDto);

      expect(result.conflicts.listIds).toContain('list-1');
      expect(mockPrismaService.list.update).not.toHaveBeenCalled();
    });

    it('should delete list for DELETE operation', async () => {
      const userId = 'user-1';
      const syncDto = {
        listOperations: [
          {
            id: 'list-1',
            type: OperationType.DELETE,
            version: 5,
            timestamp: Date.now(),
            data: null,
          },
        ],
        itemOperations: [],
      };

      const existingList = {
        id: 'list-1',
        ownerId: userId,
      };

      mockPrismaService.list.findUnique.mockResolvedValue(existingList);
      mockPrismaService.list.findMany.mockResolvedValue([]);

      await service.syncLists(userId, syncDto);

      expect(mockPrismaService.list.delete).toHaveBeenCalledWith({
        where: { id: 'list-1' },
      });
    });

    it('should process multiple operations in transaction', async () => {
      const userId = 'user-1';
      const syncDto = {
        listOperations: [
          {
            id: 'list-1',
            type: OperationType.CREATE,
            version: 0,
            timestamp: Date.now(),
            data: { title: 'List 1', type: 'SHOPPING' },
          },
          {
            id: 'list-2',
            type: OperationType.CREATE,
            version: 0,
            timestamp: Date.now(),
            data: { title: 'List 2', type: 'TODO' },
          },
        ],
        itemOperations: [],
      };

      mockPrismaService.list.findUnique.mockResolvedValue(null);
      mockPrismaService.list.findMany.mockResolvedValue([]);

      await service.syncLists(userId, syncDto);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.list.create).toHaveBeenCalledTimes(2);
    });
  });
});
```

### E2E Tests

**Файл:** `backend/test/lists-sync.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { OperationType } from '../src/lists/dto/sync.dto';

describe('Lists Sync (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Create test user and get token
    const authResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'sync-test@example.com',
        password: 'password123',
        fullName: 'Sync Test User',
      });

    authToken = authResponse.body.accessToken;
    userId = authResponse.body.user.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  afterEach(async () => {
    // Clear lists after each test
    await prisma.list.deleteMany({ where: { ownerId: userId } });
  });

  describe('POST /lists/sync', () => {
    it('should sync CREATE operations', async () => {
      const syncRequest = {
        listOperations: [
          {
            id: 'test-list-1',
            type: OperationType.CREATE,
            version: 0,
            timestamp: Date.now(),
            data: {
              title: 'E2E Test List',
              type: 'SHOPPING',
            },
          },
        ],
        itemOperations: [],
      };

      const response = await request(app.getHttpServer())
        .post('/lists/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send(syncRequest)
        .expect(200);

      expect(response.body.lists).toHaveLength(1);
      expect(response.body.lists[0].title).toBe('E2E Test List');
      expect(response.body.lists[0].version).toBe(1);
      expect(response.body.conflicts.listIds).toHaveLength(0);
    });

    it('should sync UPDATE operations', async () => {
      // Create list first
      const list = await prisma.list.create({
        data: {
          id: 'test-list-2',
          title: 'Original Title',
          type: 'TODO',
          ownerId: userId,
          version: 1,
        },
      });

      const syncRequest = {
        listOperations: [
          {
            id: list.id,
            type: OperationType.UPDATE,
            version: 1,
            timestamp: Date.now(),
            data: {
              title: 'Updated Title',
            },
          },
        ],
        itemOperations: [],
      };

      const response = await request(app.getHttpServer())
        .post('/lists/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send(syncRequest)
        .expect(200);

      expect(response.body.lists[0].title).toBe('Updated Title');
      expect(response.body.lists[0].version).toBe(2);
    });

    it('should detect version conflicts', async () => {
      const list = await prisma.list.create({
        data: {
          id: 'test-list-3',
          title: 'Server Version',
          type: 'SHOPPING',
          ownerId: userId,
          version: 5,
        },
      });

      const syncRequest = {
        listOperations: [
          {
            id: list.id,
            type: OperationType.UPDATE,
            version: 3, // Outdated version
            timestamp: Date.now() - 10000,
            data: {
              title: 'Client Version',
            },
          },
        ],
        itemOperations: [],
      };

      const response = await request(app.getHttpServer())
        .post('/lists/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send(syncRequest)
        .expect(200);

      expect(response.body.conflicts.listIds).toContain(list.id);
      expect(response.body.lists[0].title).toBe('Server Version'); // Server wins
    });

    it('should sync DELETE operations', async () => {
      const list = await prisma.list.create({
        data: {
          id: 'test-list-4',
          title: 'To Delete',
          type: 'OTHER',
          ownerId: userId,
          version: 1,
        },
      });

      const syncRequest = {
        listOperations: [
          {
            id: list.id,
            type: OperationType.DELETE,
            version: 1,
            timestamp: Date.now(),
            data: null,
          },
        ],
        itemOperations: [],
      };

      const response = await request(app.getHttpServer())
        .post('/lists/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send(syncRequest)
        .expect(200);

      expect(response.body.lists).toHaveLength(0);

      const deletedList = await prisma.list.findUnique({
        where: { id: list.id },
      });
      expect(deletedList).toBeNull();
    });

    it('should sync items operations', async () => {
      const list = await prisma.list.create({
        data: {
          id: 'test-list-5',
          title: 'List with Items',
          type: 'SHOPPING',
          ownerId: userId,
          version: 1,
        },
      });

      const syncRequest = {
        listOperations: [],
        itemOperations: [
          {
            id: 'item-1',
            listId: list.id,
            type: OperationType.CREATE,
            version: 0,
            timestamp: Date.now(),
            data: {
              content: 'Milk',
              checked: false,
            },
          },
          {
            id: 'item-2',
            listId: list.id,
            type: OperationType.CREATE,
            version: 0,
            timestamp: Date.now(),
            data: {
              content: 'Bread',
              checked: true,
            },
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/lists/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send(syncRequest)
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.items[0].content).toBe('Milk');
      expect(response.body.items[1].checked).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/lists/sync')
        .send({ listOperations: [], itemOperations: [] })
        .expect(401);
    });

    it('should validate request body', async () => {
      await request(app.getHttpServer())
        .post('/lists/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          listOperations: 'invalid', // Should be array
          itemOperations: [],
        })
        .expect(400);
    });
  });
});
```

---

## Performance Optimization

### Database Indexes

Убедись что indexes созданы для часто используемых полей:

```sql
CREATE INDEX "List_ownerId_idx" ON "List"("ownerId");
CREATE INDEX "List_version_idx" ON "List"("version");
CREATE INDEX "ListItem_listId_idx" ON "ListItem"("listId");
CREATE INDEX "ListItem_version_idx" ON "ListItem"("version");
```

### Batch Processing

Для большого количества операций можно использовать batch upsert:

```typescript
// Вместо множества update
await prisma.list.updateMany({
  where: { id: { in: listIds } },
  data: { version: { increment: 1 } },
});

// Batch create
await prisma.listItem.createMany({
  data: newItems,
  skipDuplicates: true,
});
```

### Query Optimization

```typescript
// Используй select для уменьшения payload
const lists = await prisma.list.findMany({
  where: { ownerId: userId },
  select: {
    id: true,
    title: true,
    type: true,
    version: true,
    updatedAt: true,
    items: {
      select: {
        id: true,
        content: true,
        checked: true,
        version: true,
      },
    },
  },
});
```

### Caching

Для read-heavy операций можно добавить Redis cache:

```typescript
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class ListsService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getUserLists(userId: string) {
    const cacheKey = `user:${userId}:lists`;
    const cached = await this.cacheManager.get(cacheKey);

    if (cached) {
      return cached;
    }

    const lists = await this.prisma.list.findMany({
      where: { ownerId: userId },
    });

    await this.cacheManager.set(cacheKey, lists, 300); // 5 min TTL
    return lists;
  }
}
```

---

## Migration Guide

### Пошаговая миграция существующего backend

**Step 1: Backup Database**

```bash
pg_dump wiselist > backup_$(date +%Y%m%d).sql
```

**Step 2: Update Prisma Schema**

Добавь `version` field в `List` и `ListItem` models.

**Step 3: Create Migration**

```bash
npx prisma migrate dev --name add_version_field
```

**Step 4: Update Existing Data**

```sql
-- Set version 1 for all existing records
UPDATE "List" SET "version" = 1 WHERE "version" = 0;
UPDATE "ListItem" SET "version" = 1 WHERE "version" = 0;
```

**Step 5: Generate Prisma Client**

```bash
npx prisma generate
```

**Step 6: Create Sync DTOs**

Создай файлы с DTOs как показано выше.

**Step 7: Implement Sync Endpoint**

Добавь sync метод в `ListsController` и `ListsService`.

**Step 8: Test Migration**

Запусти unit и E2E тесты для проверки.

**Step 9: Deploy**

```bash
# Production migration
npx prisma migrate deploy
```

**Step 10: Monitor**

Следи за логами и метриками после деплоя.

---

## Troubleshooting

### Проблема: Transaction deadlocks

**Решение:** Используй optimistic locking и retry логику

```typescript
async syncWithRetry(userId: string, syncDto: SyncRequestDto, retries = 3) {
  try {
    return await this.syncLists(userId, syncDto);
  } catch (error) {
    if (error.code === 'P2034' && retries > 0) {
      // Deadlock detected, retry
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.syncWithRetry(userId, syncDto, retries - 1);
    }
    throw error;
  }
}
```

### Проблема: Slow sync for large datasets

**Решение:** Pagination и incremental sync

```typescript
async syncLists(userId: string, syncDto: SyncRequestDto) {
  // Only fetch lists updated after lastSyncTimestamp
  const lists = await prisma.list.findMany({
    where: {
      ownerId: userId,
      updatedAt: syncDto.lastSyncTimestamp
        ? { gte: new Date(syncDto.lastSyncTimestamp) }
        : undefined,
    },
  });
}
```

### Проблема: Version conflicts при collaborative editing

**Решение:** Implement более сложный OT или используй CRDT

```typescript
// Используй библиотеку Yjs для CRDT
import * as Y from 'yjs'

const doc = new Y.Doc()
// Автоматическое разрешение конфликтов
```

---

## Next Steps

1. **Implement WebSocket** для real-time updates
2. **Add CRDT support** для более сложных конфликтов
3. **Implement change log** для audit trail
4. **Add metrics and monitoring** для sync операций
5. **Optimize performance** с помощью profiling

---

## Заключение

Backend готов для поддержки offline-first архитектуры:
- ✅ Version-based conflict detection
- ✅ Transaction safety
- ✅ Last Write Wins OT strategy
- ✅ Security и validation
- ✅ Comprehensive testing

**Ready to implement!** 🚀
