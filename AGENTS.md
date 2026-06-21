# AGENTS.md — контекст проекта для ассистента (Jess)

> Этот файл нужен, чтобы в **новом чате без истории** ассистент сразу понял, что
> это за проект, как он устроен и как его обновлять. Журнал правок — в
> `CHANGELOG.md` (веди его при каждом изменении данных/функционала).

---

## 1. Что это

**QA Sprint Board** — фронт-доска спринта QA-команды SprutGaming. Линейный
тестер открывает и сразу видит: кто что тестит, что свободно/можно взять, какой
прогресс по эпикам. Чисто для наглядности.

- **Есть бэкенд (BFF).** Данные тянутся из Neon Postgres + Jira через API
  (`/api/sprint/active`). `src/data/sprint.ts` остаётся как **readonly-архив
  спринта 10** и fallback, если API недоступен.
- Операционные данные (статусы, retest %, исполнители, тайтлы) — из Jira
  автоматически (Vercel Cron каждые 30 мин). QA-специфику (firstPass %, флаги,
  назначения, состав спринта) лид (Denis) правит через мини-админку `/admin`.
- Стек: **Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
  Neon Postgres (@neondatabase/serverless) · Vitest**. Деплой на Vercel.

### Запуск / проверки
```bash
npm run dev          # http://localhost:3000
npx tsc --noEmit     # типы
npm test             # vitest (unit/integration)
npm run build        # прод-сборка (главный гейт перед деплоем)
npm run migrate      # применить миграции к БД (tsx --env-file=.env.local)
npm run seed         # засеять БД из sprint.ts (идемпотентно)
```
Линтер: `npm run lint`. Прим.: в репо есть пред-существующие lint-ошибки
`react-hooks/set-state-in-effect` (page.tsx, EpicGraphModal.tsx и admin-страницы) —
они **не блокируют** `next build`. Это тех.долг, не регресс.

---

## 2. Архитектура

```
src/
  data/sprint.ts    # типы + readonly-архив спринта 10 (fallback при недоступном API)
  lib/db.ts         # Neon-клиент (sql tagged-template), query()
  lib/jira.ts       # Jira client: fetchEpicsMeta + fetchRetestPct (пагинация)
  lib/sync.ts       # синк активного спринта с Jira → jira_cache
  lib/auth.ts       # requireAdmin / isAdmin (кука admin_token, fail-closed)
  lib/format.ts     # статусы/приоритеты, расчёт прогресса спринта, аватары
  middleware.ts     # защита /admin/* (редирект на /admin/login без куки)
  components/        # Avatar, Badges, EpicCard, BoardDataProvider (фронт↔API)
  app/page.tsx       # витрина: оборачивает HomeInner в BoardDataProvider
  app/admin/         # мини-админка: login, dashboard, epics, assignments, sprints
  app/api/           # sprint/active, epics, assignments, sprint, members,
                     #   jira/sync, cron/sync, admin/login
migrations/001_initial.sql   # схема БД (6 таблиц)
scripts/migrate.ts, seed.ts  # применение миграций и сид из sprint.ts
vercel.json         # Vercel Cron: /api/cron/sync каждые 30 мин
```

### Бэкенд / БД
- **6 таблиц** (Neon Postgres): `sprints`, `sprint_epics`, `members`,
  `assignments`, `progress_entries` (firstPass %), `jira_cache` (тайтл/статус/
  исполнитель/retest % из Jira).
- `GET /api/sprint/active` собирает активный спринт: эпики (из `sprint_epics` +
  `jira_cache` + `progress_entries`), members, assignments, `syncedAt`. Контракт
  JSON — **camelCase** (jiraKey, firstPass, retestPct, slackId, onVacation,
  memberId, sprintId).
- **retest %** = `(Done + RF Release) / (все дочерние + связанные тикеты) * 100`,
  считается из Jira с пагинацией по `nextPageToken`.
- Мутирующие роуты защищены `requireAdmin` (кука `admin_token === ADMIN_TOKEN`,
  fail-closed при незаданном токене). Cron защищён `CRON_SECRET`.

### Модель данных (`src/data/sprint.ts`)
- `Epic`: `key`, `title`, `goal`, `priority`, `team` (`CORE`|`eQA`), `jiraStatus`,
  `progress?: { firstPass?, retest? }`, `links` + флаги:
  - `critbusiness` — критбизнес (красная карточка, закреплён сверху главного).
  - `bonus` — группа «Бонусы» (фиолетовая, плашка с ETA ретестов на stage).
  - `goalDone` — цель по эпику закрыта (зелёная карточка).
  - `task` — это **одиночная задача, а не эпик** → шкала прогресса скрыта.
- `JiraStatus` (1:1 с воркфлоу Jira): `analysis | backlog | in_development |
  block_tests | rf_qa | qa_testing | rf_release | done`.
- `assignments`: `{ memberId, epicKeys[], note }`. Эпик команды без назначения →
  попадает в зону «Можно взять».
- `members`: состав, `onVacation`, `shift` (eQA).
- `sprint`: номер, даты, ссылка на Confluence.

### Логика доски (`app/page.tsx`)
- Переключатель команд **CORE / eQA**.
- Ряд «зрителей» (без подписи): `Вся команда`, чип `Можно взять · N`, и каждый
  тестер. На всех кнопках — счётчик карточек (`CountBadge`).
- Режимы рендера:
  - **Вся команда** (`viewerId = null`): сверху закреплён «Критбизнес — брать
    первым» (если есть), ниже «В работе у команды».
  - **Можно взять** (`viewerId = FREE_VIEW = "__free__"`): только свободные
    **стандартные** задачи (критбизнес туда не дублируется — он на главном).
  - **Тестер** (`viewerId = id`): его карточки.
- **Шкала «Готовность спринта»**: считается автоматически в
  `sprintCompletion(teamEpics)`. Формула на эпик: `firstPass` → 0–50 %,
  `retest` → 50–100 % (если задан `retest`, берётся он). Среднее по **всем**
  эпикам команды, включая свободные и задачи с 0 % — так решил Denis (шкала по
  всему пулу спринта, а не только «в работе»).
- Маркер на шкале — % прошедшего времени спринта (`sprintProgress`),
  пилюля «успеваем / впритык / отстаём» = `completion − timePct`.

### Прогресс на карточке (`components/EpicCard.tsx`)
- **Две шкалы всегда** (для не-`task`): **«Тесты по чек-листу на stage»**
  (`firstPass`) и **«Ретесты на stage»** (`retest`).
- Если у эпика задан `retest` → первая проходка считается завершённой, поэтому
  верхняя шкала принудительно рисуется на **100 %** (логика «идут ретесты =
  чек-лист уже пройден»). Реальное число `firstPass` при этом игнорируется.
- Если `retest` не задан → нижняя шкала показывает **0 %**.
- У `task: true` шкал нет вообще.
- Карточка **не кликабельна целиком**; ссылка на Jira — на **номере тикета** в
  углу (+ кнопка «Jira» в футере). Тег проекта (BF/SD/…) убран — префикс и так в
  номере.
- ETA ретестов бонусов — константа `BONUS_RETEST_ETA` в этом файле.

---

## 3. Источники данных и как обновлять

### Обновление данных (новый способ — с бэкендом)
- **Статусы Jira и retest %** обновляются автоматически кроном каждые 30 мин
  (`/api/cron/sync`). Экстренный синк — `/admin` → кнопка «Синк Jira».
- **firstPass %** — Denis правит через `/admin/epics` (инлайн, без деплоя).
- **Флаги** (critbusiness/bonus/task/goalDone) — `/admin/epics`, чекбоксы.
- **Назначения** (кто что тестит) — `/admin/assignments` (матрица тестер × эпик).
- **Состав спринта** (какие эпики) — `/admin/epics`; **новый спринт** —
  `/admin/sprints`.
- Доска `/` читает всё из `/api/sprint/active`; при недоступном API —
  fallback на `src/data/sprint.ts`.

> Ручное редактирование `src/data/sprint.ts` для оперативных данных больше **не
> нужно** — это архив. Меняем через админку.

### Проценты — классификация шкал (контекст для firstPass)
- **Источник правды — то, что написал сам QA** (не пересчитывать дробь!).
  Пример подвоха: запись `29(82%)/77` означает **82 %**, а не 29/77.
- Если QA пишет «первая проходка / чек-лист» → это `firstPass` (вводится в
  `/admin/epics`). «ретест» → `retest` (считается из Jira автоматически).
- Отчёты QA: **Slack** — тред дня в канале daily QA (channel id `C0A7SJ68KK3`).
  **Confluence DLR** — сводка за день (при конфликте верить Slack/тестеру).

### Состав/объём спринта — Confluence «утверждённый спринт»
- Спринт 10: `https://sprutgaming.atlassian.net/wiki/x/AYCeJw`
  (tiny-link → pageId **664698881**, «Спринт 10 // 16.06 - 29.06»).
- На доске держим **только то, что тестит наша QA-команда**. Не добавляем:
  разработку (бек/фронт без тестов), PSP (тестит PSP-менеджер), задачи, которые
  тестит аккаунт-менеджер/бизнес. Если сомнение — спросить Denis.

### Декод Confluence tiny-link (`/wiki/x/XXXX` → pageId)
```python
import base64
s = "AYCeJw"                       # часть после /wiki/x/
s = s.replace('-', '/').replace('_', '+')
while len(s) % 4: s += 'A'
print(int.from_bytes(base64.b64decode(s), 'little'))
```
Затем `getConfluencePage` (Atlassian MCP) с этим pageId и `cloudId`.

---

## 4. Текущий спринт (контекст)

- **Спринт 10**, 16.06–29.06.2026 (включительно).
- Команды: **CORE** (denisk/Denis K-лид, yaroslav, aleksey, denisv, veronika,
  daria, julia, natalia, vasiliy; anton — отпуск) и **eQA** (edvard, mariia,
  egor, daniil).
- «Бонусы» (общий ETA ретестов на stage **19.06.2026**): эпики с `bonus: true`.

> Точный список эпиков, статусы и проценты смотри прямо в `src/data/sprint.ts` —
> он всегда актуальнее этого описания.

---

## 5. Деплой

- Git: репозиторий в `qa-sprint-board/`, remote `origin` →
  `github.com/woodsmokeheart/qa-sprint-board`, ветка `main`.
- Коммитить **только по просьбе Denis**. Сообщения — по-русски, в стиле
  существующих коммитов.
- Vercel тянет с `main` (автодеплой настроен).

### Переменные окружения (Vercel → Settings → Environment Variables)
Локально лежат в `.env.local` (git-ignored). На проде нужно завести:
- `DATABASE_URL` (+ `DATABASE_URL_UNPOOLED` для миграций) — из Neon.
- `JIRA_BASE_URL` = `https://sprutgaming.atlassian.net`
- `JIRA_TOKEN` = base64(`email:api_token`)
- `JIRA_CLOUD_ID` = `74d6fc17-1c7c-43e5-be7a-13f71cdc3372`
- `ADMIN_TOKEN` — случайная строка ≥ 32 символа (вход в `/admin`).
- `CRON_SECRET` — случайная строка ≥ 32 символа (защита `/api/cron/sync`).

### Первичный сид прода
После настройки `DATABASE_URL` на проде один раз применить миграции и сид:
`npm run migrate && npm run seed` (идемпотентно). Переходящие эпики переносят
firstPass % через сид при создании нового спринта.

---

## 6. Рабочие правила с Denis

- Отвечать на языке Denis (рус → рус). Стиль — живой, по делу, без воды
  (персона «Jess», см. user rules).
- Менять **только то, что попросили**. Если просят «обновить данные» — трогать
  данные, не верстку.
- Проактивно подсвечивать риски (устаревшие проценты, эпики уже `done` в Jira,
  расхождения отчётов и т.п.).
- После правок — ReadLints + при сомнении `tsc --noEmit`.
- **Историю изменений вести в `CHANGELOG.md`** (свежие — сверху).
