# Análise de Arquitetura

O projeto "RIBBAI 2.0" adota uma arquitetura híbrida que funde os conceitos de **Feature-Sliced Design** no Frontend e um padrão de **Domain-Driven Design (DDD)** simplificado (Service/Repository) no Backend. Este documento explicita como as várias peças do software interagem.

## 1. App Router
A aplicação tira proveito do **Next.js 15 App Router** (`/app`).
- As rotas são baseadas em diretórios, beneficiando de `layout.tsx`, `page.tsx` e ficheiros de gestão de erros (`error.tsx`, `not-found.tsx`).
- Todo o código neste diretório atua fundamentalmente como a camada de "Apresentação". É responsabilidade destas páginas servir HTML ao browser e invocar os componentes adequados, muitas vezes aproveitando o *Server Side Rendering (SSR)* nativo.

## 2. Server Actions
O intercâmbio de dados ou "mutações" ocorre com recurso primário aos **Server Actions** do Next.js.
- Ao contrário dos métodos tradicionais de REST, as Server Actions (localizadas conceitualmente ou explicitamente importadas para invocar Mutações) permitem chamadas transparentes de funções do servidor no Frontend.
- As Server Actions funcionam como *Controllers* que delegam a lógica pura da aplicação para os *Services*.

## 3. Services (Serviços)
A camada de **Services** (`/server/services/` ou nos serviços dentro das próprias features como em `features/business-intelligence/services/`) contém a regra de negócio.
- É nestes ficheiros que as lógicas de cálculo residem (como o CMP no Inventário, ou a geração do Health Score).
- Os Serviços executam validações adicionais e chamam múltiplos *Repositories*. Não possuem lógica ligada ao contexto HTTP puro, garantindo total reutilização, quer venha do App Router, quer de um *Script CLI*.

## 4. Repositories (Repositórios)
Os **Repositories** (`/server/repositories/`) orquestram a comunicação com o Prisma.
- Centralizam a abstração de dados (ex: `BaseRepository`), lidando com as chamadas de CRUD, os métodos de soft-delete, validação de transações atómicas e interações nativas.
- Previnem que o Prisma Client fique disperso pela aplicação.

## 5. Features (Feature-Sliced Design)
Na pasta `/features/`, a aplicação organiza os módulos de negócio de forma vertical. Em oposição ao modelo horizontal tradicional (onde todos os componentes estão numa pasta global `components`), aqui uma pasta como `features/business-intelligence/` contém os próprios:
- **Components**: UI estritamente associada ao BI.
- **Services**: Lógica daquele domínio em particular.
- **Utils**: Ficheiros de auxílio exclusivos do BI.
- **Types**: Interfaces TypeScript respeitantes ao BI.
Esta divisão minimiza a probabilidade de impacto acidental em outras secções de código aquando da alteração de um módulo.

## 6. Components e Hooks
- Os **Components** genéricos (`/components/ui/`) assentam sobre Radix UI e Tailwind CSS (via a filosofia shadcn/ui). Representam elementos visuais burros (ex: Button, Input, Table).
- Os **Hooks** customizados situam-se em `/hooks` e gerem estados React no cliente (ex: formulários e interações da API de frontend via React Query ou Zustand).

## 7. Utils e Middleware
- **Utils**: Em `/lib/utils/` encontram-se operações ubíquas, como o merge de classes Tailwind (`cn`). Nas bibliotecas `/lib/`, concentram-se instâncias globais: Prisma Client (`/lib/db`), Validadores Ambientais (`/lib/env`), Registo de Auditoria (`/lib/audit`) e Gestor de Logs (`/lib/logging`).
- **Middleware**: Presente na raiz do repositório (`middleware.ts`), atua no limite do request Next.js. Ele é a primeira barreira, intercetando todos os pedidos HTTP para averiguar as permissões do NextAuth e garantindo proteção a nível macro das rotas `/dashboard/`.

## Fluxo de Comunicação e Ciclo de Vida
1. **Utilizador** clica num botão num **Component** dentro de uma **Page** do **App Router**.
2. O Component chama um **Server Action** (ou uma rota API gerida pelo React Query).
3. O Action delega imediatamente o processamento chamando métodos nos **Services** (isolados globalmente ou do diretório **Features**).
4. O Service invoca as funções da Base de Dados através do **Repository**.
5. O Repository faz a query utilizando o **Prisma Client** exportado a partir das **Libs**.
6. Concomitantemente, o **Audit** e o **Logging** disparam registos assíncronos não obstrutivos.
7. O resultado efetua o percurso reverso até renderizar as alterações de estado no UI.