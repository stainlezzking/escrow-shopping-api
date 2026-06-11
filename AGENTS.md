\# AGENTS.md — NestJS Backend Agent Rules



You are working on a NestJS backend using PostgreSQL (Docker) and Prisma.



\---



\## Core Principles



\- Follow existing code patterns strictly.

\- Prefer simplicity over abstraction.

\- Keep controllers thin; services contain business logic.

\- Do not introduce new libraries unless explicitly requested.

\- Never hardcode secrets or credentials.



\## Controller Rules (STRICT)



\- Controllers MUST NOT contain business logic.

\- Controllers only:

&#x20; - receive request

&#x20; - call service

&#x20; - return response

\- Any computation, transformation, or DB logic belongs in services.



\## Security Rules



\- Never return passwords, hashes, or secrets in API responses.

\- Always exclude sensitive fields using select or transformation.

\- Environment variables must never be logged.



\## Dependency Rules



\- All services MUST use NestJS Dependency Injection.

\- No manual instantiation of services using `new`.

\- External dependencies must be injected via constructors only.



\## API Response Standard



All endpoints MUST return a consistent response shape:



{

&#x20; "success": boolean,

&#x20; "data": any,

&#x20; "message": string

}



\- Errors must follow a consistent exception format

\- Never return raw Prisma errors or stack traces to clients



\## Testing Rules



\- Each module should be designed to be testable.

\- Business logic must not depend on external state directly.

\- Services should be unit-test friendly.



\## Error Handling Rules



\- All errors must go through NestJS Exception Filters or built-in HttpException.

\- Never throw raw errors or unknown exceptions.

\- All service errors must be converted into meaningful HTTP exceptions.



\## Validation Rules (CRITICAL)



\- All incoming request data MUST be validated using DTOs and class-validator.

\- No raw request body should be used directly in services.

\- Every DTO must define explicit validation rules (@IsString, @IsEmail, @IsOptional, etc.)

\- ValidationPipe must be enabled globally in the application.



\## Code Quality Rules (IMPORTANT)



\- All services MUST include JSDoc comments explaining:

&#x20; - class purpose

&#x20; - each public method

&#x20; - parameters and return values



\- All controllers MUST include:

&#x20; - Swagger decorators for endpoints (@ApiTags, @ApiOperation, @ApiResponse, etc.)

&#x20; - Clear endpoint descriptions



\- DTOs MUST include:

&#x20; - Swagger property decorators (@ApiProperty)



\- No endpoint should exist without Swagger documentation.



\- No service method should be undocumented.



\---



\## Project Structure Rules



\- src/modules = feature-based modules

\- Each module must include:

&#x20; - controller

&#x20; - service

&#x20; - dto

&#x20; - module file



\---



\## Database Rules



\- PostgreSQL runs only in Docker

\- Prisma is the only ORM

\- All DB changes must go through Prisma migrations



\---



\## Before Completing Any Task



1\. Ensure code compiles

2\. Ensure NestJS structure is respected

3\. Validate Prisma schema consistency if DB changes exist

4\. Do not leave incomplete TODO logic



\---



\## Infrastructure Rule



\- Never modify Docker setup unless explicitly requested

\- infra/docker-compose.yml is the source of truth



\---



\## Skills Reference Rule (IMPORTANT)



All operational instructions are in skills.md.



You MUST consult skills.md before implementing logic.



\---



\## Definition of Done



A task is complete only when:

\- code is correct and complete

\- NestJS compiles without errors

\- DB migrations are applied if needed

\- no missing runtime dependencies


