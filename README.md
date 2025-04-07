<div align="center">
 <img width="524" src="https://github.com/user-attachments/assets/d460817f-058a-4d3f-b75c-b897c954ecdc" />
</div>

# [Lumitech](https://lumitech.co/) Node.js Fastify Template 
Welcome to the Lumitech Node.js Fastify Template. This template provides a well-organized starting point for building back-end applications in Node.js, featuring Swagger-based API documentation, ready-to-use Docker configuration, and Awilix for dependency injection. With well-defined architectural patterns, it helps ensure the code remains maintainable, scalable, and testable, especially as the application grows.

### About Lumitech
[Lumitech](https://lumitech.co/) is a custom software development company providing professional services worldwide. We partner with technology businesses globally helping them to build successful engineering teams and create innovative software products. We’re a global team of software engineers, AI and ML specialists, product managers, and technology experts who have achieved a 600% growth rate since 2022. When a rocket launches toward the moon, it doesn’t stop halfway. Neither do we.

## 🛠️ Technology Stack:
- [TypeScript](https://www.typescriptlang.org/) - programming language;
- [Node.js](https://nodejs.org/en) - JavaScript runtime;
- [Fastify](https://fastify.dev/docs/latest/Guides/Getting-Started/) - HTTP framework;
- [Zod](https://zod.dev) - validation;
- [Swagger](https://swagger.io/) - API documentation;
- [Awilix](https://github.com/jeffijoe/awilix) - Dependency Injection container;
- [PostgreSQL](https://www.postgresql.org/) - relational database;
- [Prisma](https://www.prisma.io/docs/getting-started) - database ORM;
- [Vitest](https://vitest.dev/) - testing framework.

## 📌 Getting Started

### 🚀 Project Launch
1. `npm install` - install the dependencies locally;
2. Create a `.env` file from `.env.example`;
3. Launch Docker Compose with the `docker compose up` command.

### ⚙️ Running Prisma Migrations
Since both the Node.js server and PostgreSQL database run inside Docker containers, the database connection uses the [docker compose network](https://docs.docker.com/compose/networking/).
Inside the Node.js container, use `postgresdb` as the database host.

To run migrations from a host machine:
1. Launch docker containers - `docker compose up`;
2. Update the `.env` file, changing `DATABASE_URL` host from `postgresdb` to `localhost`;
3. Run `npm run prisma:migrate:create` - create SQL migration file;
4. Name the new migration and verify the SQL code generated;
5. Run `npm run prisma:migrate:apply` - apply the migration to the database;
6. Revert the `DATABASE_URL` in `.env`  back to `postgresdb` so that the Node.js container can connect to the database after a rebuild.

### 🧪 Running Tests
Unit tests ensure individual components function correctly in isolation. The template uses a Vitest testing framework for comprehensive test coverage:
1. `npm run test:unit` - run all unit tests with detailed output in the terminal;
2. `npm run test:unit:ui` - launch the interactive UI test runner.

## ⚙ Key Features

### 🧩 Dependency Injection

This template utilizes **Awilix** for Dependency Injection (DI), which helps in managing application dependencies efficiently.

#### Why Use Dependency Injection?
- **Encapsulation & Maintainability**: Keeps the code modular and easier to maintain.
- **Testability**: Improves unit testing by allowing easy mocking of dependencies.
- **Cleaner Architecture**: Enhances readability and organization.
- **Implemented Patterns**: Uses Dependency Inversion, Inversion of Control, and Singleton.

#### How Awilix is Used

Awilix is configured as a Fastify plugin, allowing services, handlers, repositories and custom dependencies to be injected dynamically. It enables clean and organized code by managing dependencies automatically. The DI container is registered in `src/plugins/awilix.ts`.

#### DI Usage Example:

Define an email service abstraction layer in the lib directory.

`src/lib/emails/index.ts`
```typescript
export type EmailService = {
    sendEmail: (emailRecipient: string, p: EmailOptions) => Promise<void>;
};

export const createEmailService = (
    config: EnvConfig,
    log: FastifyBaseLogger
): EmailService => {
    const emailProvider = new EmailProvider({ secretKey: config.secretKey });

    return {
        sendEmail: async (emailRecipient, email) => {
            ...
            await emailProvider.sendEmail(emailRecipient, email);
            ...
        },
    };
};
```
Register the email service in the DI container.

`src/plugins/awilix.ts`
```typescript
// Register dependencies from plugins and libraries
fastify.di.register({
    log: asValue(fastify.log),
    config: asValue(fastify.config),
    emailService: asFunction(createEmailService),
});
```
Use the email service by specifying its name in the function parameters.

`src/modules/user/user.service.ts`
```typescript
export type UserService = {
    sendWelcomeEmail: (
        userId:string,
    ) => Promise<UserEventsResponseBody>;
};

export const createUserService = (
    emailService: EmailService,
): UserService => ({
    sendWelcomeEmail: async (userId) => {
        ...
        await emailService.sendEmail(email, {...});
        ...
    },
});

addDIResolverName(createService, "userService"); // Define a unique DI container name for automatic loading.
```

### 🐳 Docker
This template provides a `Dockerfile` for building a production-ready Node.js image and a `docker-compose.yml` file for local development. By default, Docker Compose starts two services:

1. **Node.js** – Runs the application inside a container using the provided Dockerfile.
2. **PostgreSQL** – Spins up a PostgreSQL database.

Is is possible can add more services (for example, Redis) by including them in `docker-compose.yml` and configuring their networking and environment variables. 
This setup allows to quickly bootstrap a fully containerized development environment without installing any dependencies locally other than Docker itself.

### 📖 REST API Documentation

This template includes **Swagger** for automatic API documentation generation, making it easy to document REST API endpoints.

#### Automatic Generation

- **Swagger Integration**: The Fastify Swagger plugin automatically generates API documentation from route schemas.
- **Route Description**: It is possible to categorize endpoints by tags and describe them in the route schema.
- **Authorization**: Secure the documentation with a password.

Example route with Swagger options:
```typescript
fastify.post(
    "/sign-up",
    {
        schema: {
            tags: ["auth"], // Categorizes the route under the specified tags.
            summary: "Create a new user account".
            description: "Create a new user within the system",
            body: signUpBodySchema,
            response: {
                200: signUpResponseSchema,
            },
        },
    },
    authHandler.signUp
);
```

### ⚙️ Repository Generation
The template provides an automatic repository generator based on the Prisma Schema data model.
It includes a set of commonly used CRUD operations for any entity.

The generator is located in `src/database/repositories/generate.repository.ts`.

```typescript
const userRepository = generateRepository(prismaClient, "User");

const user = await userRepository.create({
    data: {},
    select: {},
});

// Methods available: create, update, delete, etc.
await userRepository.delete({
    where: {},
});
```

### 📜 Commits Format

We use Commitlint to ensure that commit messages adhere to the conventional commit format. This standardizes the commit history and simplifies changelog generation.

The basic format is:
```sh
type(scope?): subject
```

Examples:
- `chore: update dependencies`
- `fix(message): correct API response error`
- `feat(auth): add JWT authentication`

A more detailed description you can see in [Conventional Commits documentation](https://www.conventionalcommits.org/en/v1.0.0/#examples).

## 📁 Project Structure
The project is organized into several parts to promote a modular design and separation of concerns:

#### `src/database`:  
This directory manages everything related to data persistence and interaction with the database.  
- The `prisma` subfolder houses the Prisma schema (`schema.prisma`) and migration files that define the application's data model to the database.  
- The `repositories` subfolder contains repository modules for each entity. These repositories provide a unified API for CRUD operations (e.g., in `generate.repository.ts`) and custom logic for data access (e.g., `message.repository.ts` for the Message model).

#### `src/modules`:  
This directory contains feature-based modules which encapsulate business logic along with the HTTP layer.  
Each module includes:  
- **Routes**: Define endpoint paths and attach them to the appropriate handlers (e.g., `message.route.ts` for message-related endpoints).  
- **Handlers**: Manage request processing and response formatting by invoking corresponding services (e.g., `message.handler.ts`).  
- **Services**: Implement business logic, coordinate with repositories, and use the necessary third-party libraries from `src/lib` (e.g., `message.service.ts`).

#### `src/plugins`:  
The directory is dedicated to Fastify plugins which extend the server capabilities. Each file registers a plugin that adds functionality to the Fastify instance.  
Plugins included:  
- **Environment Configuration** (`env.ts`): Loads and validates environment variables.  
- **Database Management** (`prisma.ts`): Sets up a `PrismaClient` and manages database connection.  
- **Authentication** (`jwt.ts`): Configures JSON Web Token handling for security.  
- **API Documentation** (`swagger.ts` and `zod.ts`): Integrates Swagger for API documentation and Zod for schema validation.  
- **Dependency Injection** (`awilix.ts`): Registers and manages service dependencies using Awilix.  
- **Error Handling** (`error.ts`): Provides a centralized mechanism for managing application errors.

#### `src/lib`:  
  This directory serves as an abstraction layer for third-party services and integrations. It is designed to encapsulate interactions with external services such as BullMQ for job processing, Stripe for payment processing, email sending services, file storage providers (e.g. AWS S3, GCP Cloud Storage), and more.  
  These abstraction layers are registered in the Awilix container and imported by services as needed. Additionally, this folder includes validation schemas using Zod for different modules, as well as utility functions and helpers that support the overall application infrastructure.

#### `src/types`:  
  Global TypeScript types and declarations used across the project.

#### `test`:
This directory contains all test files organized to mirror the structure of the source code.
- The `unit` subdirectory contains unit tests that verify the functionality of individual components in isolation.
  - Tests for library components are in the `lib` subdirectory, ensuring third-party integrations work as expected.
  - Tests for application modules are in the `modules` subdirectory, organized by feature to test services.
- Each test file follows the naming convention of `[component-name].test.ts` to clearly identify what's being tested.

#### Project Tree:
```
.
├── commitlint.config.js
├── docker-compose.yml
├── Dockerfile
├── eslint.config.mjs
├── nodemon.json
├── package.json
├── package-lock.json
├── README.md
├── src
│   ├── database
│   │   ├── prisma
│   │   │   ├── migrations
│   │   │   │   └── ...
│   │   │   ├── prisma.type.ts
│   │   │   └── schema.prisma
│   │   └── repositories
│   │       ├── generate.repository.ts
│   │       └── ...
│   ├── lib
│   │   ├── ...
│   │   └── validation
│   │       └── feature
│   │           ├── index.ts
│   │           └── feature.schema.ts
│   ├── modules
│   │   ├── application.ts
│   │   └── feature
│   │       ├── index.ts
│   │       ├── feature.handler.ts
│   │       ├── feature.route.ts
│   │       └── feature.service.ts
│   ├── plugins
│   │   ├── awilix.ts
│   │   ├── cors.ts
│   │   ├── env.ts
│   │   ├── error.ts
│   │   ├── jwt.ts
│   │   ├── prisma.ts
│   │   ├── swagger.ts
│   │   └── zod.ts
│   ├── types
│   │   ├── env.type.ts
│   │   └── index.d.ts
│   ├── index.ts
│   └── server.ts
├── test
│   └── unit
│       ├── lib
│       │   └── ...
│       └── modules
│           └── feature
│               ├── feature-service.test.ts
│               └── ...
└── tsconfig.json
```

## ✨ Inspired by
- [Fastify example](https://github.com/delvedor/fastify-example) - a brief example of core Fastify features;
- [Guide to plugins](https://fastify.dev/docs/latest/Guides/Plugins-Guide/) - encapsulation and decorators in Fastify.
