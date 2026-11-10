# Projeto Mobile API — NestJS + Prisma + MySQL

API REST desenvolvida com **NestJS, TypeScript, Prisma ORM e MySQL**, responsável pelo gerenciamento de usuários, autenticação e atividades físicas e esportivas do Projeto Mobile.

A API é consumida por um aplicativo React Native, que utiliza Axios e JSON para realizar requisições HTTP.

## Repositórios

- **Backend:** https://github.com/douchasdev/projeto-mobile-api
- **Frontend:** https://github.com/douchasdev/projeto-mobile

## 1. Objetivo

Desenvolver uma API REST capaz de fornecer os recursos necessários para o funcionamento de um aplicativo de gerenciamento de atividades físicas e esportivas.

A API permite autenticar usuários, criar e gerenciar atividades, identificar os responsáveis pelos cadastros e registrar interesses de participação.

O backend centraliza a persistência dos dados oficiais, a validação das requisições e as regras de autorização.

## 2. Tecnologias utilizadas

| Tecnologia | Finalidade |
|---|---|
| Node.js | Ambiente de execução |
| TypeScript | Linguagem utilizada |
| NestJS | Framework backend |
| Prisma ORM | Acesso e modelagem do banco de dados |
| MySQL | Persistência principal |
| JWT | Autenticação e autorização |
| Argon2 | Hash de senhas |
| class-validator | Validação de dados |
| class-transformer | Transformação e validação de objetos |
| NestJS Throttler | Limitação de requisições |

O projeto utiliza Prisma 7 e um Prisma Client gerado na estrutura do próprio backend.

## 3. Arquitetura

A aplicação segue a arquitetura modular do NestJS, separando responsabilidades entre controllers, services, módulos e DTOs.

Fluxo principal:

```text
React Native
     |
     | Axios + JSON
     | Authorization: Bearer JWT
     v
NestJS API
     |
     +-- AuthModule
     |
     +-- UsersModule
     |
     +-- ActivitiesModule
             |
             v
       ActivitiesService
             |
             v
        Prisma ORM
             |
             v
           MySQL
```

### Controllers

Recebem as requisições HTTP, identificam os parâmetros e encaminham as operações aos serviços.

### Services

Implementam as regras de negócio, realizam verificações de autorização e acessam o banco de dados.

### DTOs

Definem e validam os dados recebidos nas operações de criação e atualização.

### Prisma

Realiza o mapeamento entre os modelos TypeScript e as tabelas do MySQL.

## 4. Funcionalidades

### 4.1. Gerenciamento de usuários

- Cadastro de usuários;
- Armazenamento de nome e e-mail;
- Validação de dados de entrada;
- Armazenamento de senhas utilizando hash;
- Identificação de usuários durante as operações autenticadas.

### 4.2. Autenticação JWT

A autenticação utiliza JSON Web Token.

Após o login, o aplicativo recebe um token utilizado nas requisições protegidas.

Exemplo:

```http
Authorization: Bearer TOKEN_JWT
```

O JWT permite identificar o usuário autenticado sem exigir que o frontend envie manualmente o ID da conta em cada operação.

As rotas protegidas utilizam `JwtAuthGuard`.

O sistema também oferece um endpoint para consultar e validar a sessão autenticada, utilizado pelo frontend durante a inicialização.

### 4.3. Gerenciamento de atividades

A API permite:

- Listar atividades de todos os usuários;
- Listar apenas as atividades do usuário autenticado;
- Criar atividades;
- Editar informações;
- Alterar o status entre pendente e concluída;
- Excluir atividades.

As operações de edição, alteração de status e exclusão são restritas ao criador da atividade.

### 4.4. Identificação do criador

Cada atividade possui uma relação com o usuário responsável pelo cadastro.

O campo `ownerId` identifica o proprietário.

Nas respostas da API, a relação `owner` também permite retornar o nome do criador.

Exemplo:

```json
{
  "ownerId": "uuid-do-usuario",
  "owner": {
    "id": "uuid-do-usuario",
    "name": "Gabriel"
  }
}
```

Essas informações são utilizadas pelo frontend para identificar o criador nos cartões da Home.

### 4.5. Interesse em atividades

Usuários autenticados podem demonstrar interesse em participar de atividades criadas por outras pessoas.

A API permite:

- Registrar interesse;
- Retirar interesse;
- Consultar a quantidade de interessados;
- Consultar os nomes dos interessados;
- Identificar se o usuário autenticado já demonstrou interesse.

O registro representa apenas uma manifestação de interesse, não uma inscrição confirmada.

## 5. Modelagem do banco de dados

O banco MySQL possui três modelos principais.

### 5.1. User

Representa os usuários cadastrados.

Principais campos:

| Campo | Descrição |
|---|---|
| `id` | Identificador UUID |
| `name` | Nome do usuário |
| `email` | E-mail único |
| `passwordHash` | Hash da senha |
| `createdAt` | Data de criação |
| `updatedAt` | Data da última atualização |

Um usuário pode criar várias atividades e demonstrar interesse em várias atividades de outros usuários.

### 5.2. Activity

Representa as atividades cadastradas.

| Campo | Descrição |
|---|---|
| `id` | Identificador UUID |
| `title` | Título |
| `description` | Descrição opcional |
| `scheduledAt` | Data e horário |
| `location` | Local |
| `completed` | Status de conclusão |
| `ownerId` | ID do criador |
| `createdAt` | Data de criação |
| `updatedAt` | Data da última atualização |

Cada atividade pertence a um usuário.

### 5.3. ActivityInterest

Representa o interesse de um usuário em uma atividade.

| Campo | Descrição |
|---|---|
| `activityId` | ID da atividade |
| `userId` | ID do interessado |
| `createdAt` | Data do registro |

O modelo estabelece um relacionamento muitos-para-muitos entre usuários e atividades.

A chave primária é composta por `activityId` e `userId`.

Exemplo simplificado:

```prisma
model ActivityInterest {
  activityId String   @db.Char(36)
  userId     String   @db.Char(36)
  createdAt  DateTime @default(now())

  activity Activity @relation(
    fields: [activityId],
    references: [id],
    onDelete: Cascade
  )

  user User @relation(
    fields: [userId],
    references: [id],
    onDelete: Cascade
  )

  @@id([activityId, userId])
  @@index([userId])
}
```

No arquivo `schema.prisma`, as declarações `@relation` podem ser mantidas em uma única linha.

A chave composta impede registros duplicados para o mesmo usuário e a mesma atividade.

O relacionamento também utiliza exclusão em cascata, removendo os interesses associados quando uma atividade é excluída.

## 6. Endpoints da API

### 6.1. Autenticação

O módulo de autenticação implementa o cadastro, o login e a validação da sessão utilizada pelo frontend.

As operações retornam as informações necessárias para autenticar o usuário e acessar os recursos protegidos.

Consulte `src/auth/` e `src/users/` para a definição exata das rotas de autenticação da versão instalada.

### 6.2. Atividades

Todas as rotas de atividades exigem autenticação JWT.

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/activities` | Lista todas as atividades |
| GET | `/activities/my` | Lista atividades do usuário autenticado |
| POST | `/activities` | Cria uma atividade |
| PATCH | `/activities/:id` | Atualiza uma atividade |
| PATCH | `/activities/:id/status` | Altera o status |
| DELETE | `/activities/:id` | Exclui uma atividade |

### 6.3. Interessados

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/activities/:id/interests` | Registra interesse |
| DELETE | `/activities/:id/interests/me` | Retira o próprio interesse |

O identificador do interessado é extraído do token JWT.

Não é necessário enviar `userId` no corpo das requisições.

## 7. Exemplos de requisições

### 7.1. Listar todas as atividades

```http
GET http://localhost:3000/activities
Authorization: Bearer TOKEN_JWT
```

### 7.2. Listar minhas atividades

```http
GET http://localhost:3000/activities/my
Authorization: Bearer TOKEN_JWT
```

### 7.3. Criar atividade

```http
POST http://localhost:3000/activities
Authorization: Bearer TOKEN_JWT
Content-Type: application/json
```

Corpo JSON:

```json
{
  "title": "Futebol de quarta-feira",
  "description": "Partida entre amigos",
  "scheduledAt": "2026-11-12T19:00:00.000Z",
  "location": "Ginásio Municipal"
}
```

O campo `scheduledAt` representa a data e o horário da atividade.

O frontend converte a data e o horário selecionados pelo usuário em uma string ISO antes de enviar a requisição.

### 7.4. Editar atividade

```http
PATCH http://localhost:3000/activities/UUID_DA_ATIVIDADE
Authorization: Bearer TOKEN_JWT
Content-Type: application/json
```

Exemplo:

```json
{
  "title": "Futebol no ginásio",
  "location": "Ginásio Municipal"
}
```

Somente o criador pode realizar essa alteração.

### 7.5. Alterar status

```http
PATCH http://localhost:3000/activities/UUID_DA_ATIVIDADE/status
Authorization: Bearer TOKEN_JWT
Content-Type: application/json
```

Corpo:

```json
{
  "completed": true
}
```

Para retornar ao estado pendente:

```json
{
  "completed": false
}
```

### 7.6. Excluir atividade

```http
DELETE http://localhost:3000/activities/UUID_DA_ATIVIDADE
Authorization: Bearer TOKEN_JWT
```

Após uma exclusão bem-sucedida, o endpoint retorna HTTP `204 No Content`.

### 7.7. Demonstrar interesse

```http
POST http://localhost:3000/activities/UUID_DA_ATIVIDADE/interests
Authorization: Bearer TOKEN_JWT
```

Não é necessário enviar corpo JSON.

O backend identifica o usuário pelo JWT e registra o interesse.

Após a confirmação, retorna a atividade com as informações atualizadas.

### 7.8. Retirar interesse

```http
DELETE http://localhost:3000/activities/UUID_DA_ATIVIDADE/interests/me
Authorization: Bearer TOKEN_JWT
```

O endpoint remove o interesse associado ao usuário autenticado e retorna HTTP `204 No Content`.

## 8. Estrutura da resposta JSON

As respostas das atividades incluem informações do criador e dos interessados.

Exemplo ilustrativo:

```json
{
  "id": "uuid-da-atividade",
  "title": "Futebol de quarta-feira",
  "description": "Partida entre amigos",
  "scheduledAt": "2026-11-12T19:00:00.000Z",
  "location": "Ginásio Municipal",
  "completed": false,
  "ownerId": "uuid-do-criador",
  "owner": {
    "id": "uuid-do-criador",
    "name": "Gabriel"
  },
  "interestCount": 1,
  "interestedUsers": [
    {
      "id": "uuid-do-interessado",
      "name": "Igor"
    }
  ],
  "hasInterest": false
}
```

Também são retornados os campos de criação e atualização.

### Campos relacionados ao interesse

| Campo | Significado |
|---|---|
| `interestCount` | Quantidade de interessados |
| `interestedUsers` | Lista de usuários interessados |
| `hasInterest` | Indica se o usuário da requisição já registrou interesse |

O valor de `hasInterest` é calculado considerando o usuário autenticado.

## 9. Regras de negócio

### 9.1. Propriedade das atividades

A criação de uma atividade associa automaticamente o registro ao usuário autenticado.

O proprietário pode editar, alterar o status e excluir suas atividades.

Usuários que não são proprietários não podem executar essas operações.

### 9.2. Interesse na própria atividade

O criador de uma atividade não pode registrar interesse nela.

A regra é verificada no backend, independentemente das verificações feitas pela interface.

### 9.3. Duplicidade de interesses

Um usuário pode registrar apenas um interesse em cada atividade.

A chave composta do Prisma impede duplicações no banco.

Uma tentativa de registrar um interesse já existente resulta em erro de conflito.

### 9.4. Exclusão de atividades

Quando uma atividade é excluída, seus registros de interesse também são removidos.

Isso evita manter vínculos com atividades inexistentes.

### 9.5. Autorização

As regras de autorização são aplicadas no servidor, não apenas no aplicativo.

O frontend pode ocultar botões e impedir ações inválidas, mas o backend continua responsável pela validação final.

## 10. Tratamento de erros

A API utiliza exceções HTTP do NestJS para informar falhas.

Exemplos:

| Código | Situação |
|---|---|
| 400 | Dados inválidos ou tentativa de interesse na própria atividade |
| 401 | Usuário não autenticado |
| 403 | Usuário sem permissão |
| 404 | Atividade não encontrada |
| 409 | Interesse duplicado |
| 500 | Falha interna do servidor |

As mensagens retornadas podem ser utilizadas pelo frontend para informar o usuário sobre problemas durante as operações.

## 11. Integração com o frontend

O aplicativo React Native utiliza Axios para consumir os endpoints REST.

A comunicação é feita por HTTP, com dados JSON.

O JWT é incluído nas requisições protegidas.

Fluxo:

```text
React Native
      |
      v
Axios
      |
      | JSON + JWT
      v
Controller NestJS
      |
      v
Service NestJS
      |
      v
Prisma ORM
      |
      v
MySQL
```

O backend é responsável pelos dados oficiais.

O frontend utiliza AsyncStorage para preferências e SQLite para manter uma cópia local das atividades.

O SQLite não substitui o MySQL e não permite registrar alterações offline.

## 12. Estrutura do projeto

```text
projeto-mobile-api/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── auth/
│   │   └── guards/
│   ├── users/
│   ├── activities/
│   │   ├── dto/
│   │   │   ├── create-activity.dto.ts
│   │   │   ├── update-activity.dto.ts
│   │   │   └── update-status.dto.ts
│   │   ├── activities.controller.ts
│   │   ├── activities.service.ts
│   │   └── activities.module.ts
│   ├── prisma/
│   ├── generated/
│   │   └── prisma/
│   ├── app.module.ts
│   └── main.ts
├── prisma7.config.ts
├── package.json
└── README.md
```

## 13. Instalação e configuração

### Pré-requisitos

- Node.js e npm;
- Servidor MySQL disponível;
- Variáveis de ambiente configuradas;
- Prisma Client gerado.

### 13.1. Clonar o repositório

```bash
git clone https://github.com/douchasdev/projeto-mobile-api.git
cd projeto-mobile-api
```

### 13.2. Instalar dependências

```bash
npm install
```

### 13.3. Configurar o banco MySQL

Crie o banco de dados utilizado pelo projeto.

Exemplo:

```sql
CREATE DATABASE projeto_mobile
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

Caso a configuração de migrações utilize um banco auxiliar (*shadow database*), crie-o e configure as respectivas permissões.

### 13.4. Configurar variáveis de ambiente

Crie o arquivo `.env` na raiz do projeto.

Exemplo de configuração:

```dotenv
PORT=3000

DATABASE_URL="mysql://usuario:senha@localhost:3306/projeto_mobile"

JWT_SECRET="substitua-por-uma-chave-secreta-forte"
```

Se `prisma7.config.ts` utilizar um banco auxiliar, configure também a variável correspondente:

```dotenv
SHADOW_DATABASE_URL="mysql://usuario:senha@localhost:3306/projeto_mobile_shadow"
```

As configurações acima são exemplos. Ajuste os nomes e valores conforme o ambiente utilizado pelo projeto.

**Não envie o arquivo `.env` para o repositório.**

### 13.5. Validar o Prisma

Para a configuração do Prisma 7 utilizada no projeto:

```bash
npx prisma validate --config ./prisma7.config.ts
```

### 13.6. Aplicar migrações

```bash
npx prisma migrate dev --config ./prisma7.config.ts
```

As migrações incluem os modelos de usuários, atividades e interesses.

Não utilize comandos de redefinição do banco em ambientes com dados que precisam ser preservados.

### 13.7. Gerar o Prisma Client

```bash
npx prisma generate --config ./prisma7.config.ts
```

O Prisma Client é gerado em:

```text
src/generated/prisma/
```

### 13.8. Iniciar o servidor

```bash
npm run start:dev
```

A API utiliza a porta configurada no ambiente, normalmente `3000`.

Para permitir que o aplicativo instalado em um celular físico se conecte ao backend, utilize o IP local do computador e verifique as permissões de acesso da rede e do firewall.

## 14. Comandos úteis

### Executar em desenvolvimento

```bash
npm run start:dev
```

### Compilar

```bash
npm run build
```

### Verificar TypeScript

```bash
npx tsc --noEmit
```

### Executar a versão compilada

```bash
npm run start:prod
```

### Validar o schema Prisma

```bash
npx prisma validate --config ./prisma7.config.ts
```

### Aplicar migrações

```bash
npx prisma migrate dev --config ./prisma7.config.ts
```

### Gerar Prisma Client

```bash
npx prisma generate --config ./prisma7.config.ts
```

## 15. Testes da API

Os endpoints podem ser testados utilizando Postman ou outra ferramenta de requisições HTTP.

### Roteiro com dois usuários

1. Cadastrar ou autenticar dois usuários;
2. Criar uma atividade com o usuário A;
3. Consultar as atividades utilizando o JWT do usuário B;
4. Confirmar o nome do criador;
5. Registrar interesse do usuário B;
6. Verificar a quantidade e a lista de interessados;
7. Tentar registrar o mesmo interesse novamente;
8. Confirmar que a duplicidade é rejeitada;
9. Tentar registrar interesse do usuário A na própria atividade;
10. Confirmar que a operação é rejeitada;
11. Retirar o interesse do usuário B;
12. Excluir a atividade com o usuário A;
13. Confirmar que a atividade e seus vínculos foram removidos.

### Testes de autorização

Também devem ser verificados os comportamentos das rotas protegidas quando uma requisição é enviada sem JWT, com token inválido ou por um usuário que não possui permissão para modificar a atividade.

## 16. Segurança

O backend utiliza mecanismos de autenticação e autorização para proteger as operações.

Entre os cuidados adotados estão:

- Utilização de JWT;
- Hash de senhas;
- Validação dos dados recebidos;
- Controle de propriedade das atividades;
- Proteção de endpoints;
- Prevenção de interesses duplicados;
- Limitação de requisições conforme a configuração da aplicação.

Em ambientes de produção, recomenda-se utilizar HTTPS, proteger as credenciais do banco e manter o segredo JWT fora do código-fonte.

## 17. Limitações conhecidas

- O interesse em uma atividade não representa confirmação de presença.
- Não existe controle de vagas.
- Não há sistema de mensagens entre participantes.
- Não há envio de notificações de interesse.
- A API não fornece sincronização de escritas realizadas offline.
- O funcionamento offline do frontend está limitado à consulta de informações previamente armazenadas no SQLite.

## 18. Considerações finais

A API fornece a infraestrutura necessária para o gerenciamento de usuários, atividades e interessados.

A utilização de **NestJS** permite separar as responsabilidades da aplicação, enquanto o **Prisma ORM** facilita a comunicação com o **MySQL**.

O JWT fornece identificação e autorização das operações, e os relacionamentos entre usuários, atividades e interessados permitem integrar funcionalidades de interação social ao aplicativo.

O backend atua como fonte oficial dos dados, enquanto o frontend concentra a experiência do usuário, a geolocalização, as preferências locais e a leitura offline.

## Frontend

O aplicativo está disponível em:

https://github.com/douchasdev/projeto-mobile