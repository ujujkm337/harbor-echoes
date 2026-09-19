# Сборка APK — ГАВАНЬ

## Вариант A — Локально (если 2ГБ ОЗУ хватит)
```bash
cd harbor-echoes
npm install
npm run build
npx cap add android   # первый раз
npx cap sync
# Открой Android Studio:
npx cap open android
# В Android Studio: Build -> Build APK
```

## Вариант B — Через GitHub Actions (надёжно, рекомендую)
1. Создай пустой репозиторий на GitHub
2. Залей папку harbor-echoes:
```bash
git init
git add .
git commit -m "harbor v0.9"
git branch -M main
git remote add origin https://github.com/ТВОЙ_НИК/harbor-echoes.git
git push -u origin main
```
3. В репозитории уже есть `.github/workflows/android.yml` — экшен сам соберёт APK
4. Зайди в Actions -> последний ран -> внизу артефакт `harbor-apk` -> скачай .apk
5. Установи на телефон (разреши установку из неизвестных источников)

> Если дашь мне GitHub API token, я залью сам и запущу сборку.

## Вариант C — PWA (без установки APK)
Открой https://ТВОЙ_ПРЕВЬЮ_ХОСТ на телефоне -> меню браузера -> "Установить приложение" / "Добавить на главный экран". Работает офлайн, как нативное.

## Godot ветка
Папка `godot-export/` — заготовка для Godot 4.2. Скопируй ассеты из `assets/` в `godot-export/assets/` и открой `project.godot` в Godot. Логика из `app.js` 1-в-1 переносится на GDScript (уже есть комментарии).
