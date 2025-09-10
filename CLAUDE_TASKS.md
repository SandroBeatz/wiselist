# CLAUDE_TASKS.md

## T[ask 1 (Редактирование]() профиля) - **DONE**

Контекст: 
- [SettingsProfile](src/pages/SettingsProfile) есть страница просто с данными

Описание:
- Нужно сделать форму для редактирования Имени, емайла и смена пароля
- Так же смена аватарки, если нет урла аватарки, то выбираем из списка разных аватарок. можно пока просто цвета, и будет сохранятся как avatar_icon

Инструкции: 
- придерживайся структуре FSD
- Используй ionic компоненты с импортами

**Выполнено:**
- Создана полноценная форма редактирования профиля с валидацией
- Добавлен выбор аватара из цветовых вариантов (8 цветов)
- Реализована смена имени, email и пароля
- Добавлена feature Profile с композаблом useEditProfileForm
- Обновлен user store с методами updateProfile и changePassword
- Добавлены API методы для обновления профиля
- Интегрированы toast уведомления об успехе/ошибке

feat: add profile editing form with avatar colors and validation

Правки - **ВЫПОЛНЕНО:**
- ✅ должно быть 3 формы
- ✅ 1 аватарка и имя
- ✅ 2 емеил
- ✅ 3 смена пароля
- ✅ По дизайну убери тени и отступы
- ✅ форма аватарки и имени должна быть сразу, далее 2 лист айтема - сменить эмаил и сменить пароль. Будет открывать попап для каждой формы

**Реализовано:**
- Разделено на 3 отдельные формы
- Основная форма: аватар + имя (сразу видна, редактируется inline)
- Два ion-item с кнопками для смены email и пароля
- Модальные попапы для смены email и пароля с полной валидацией
- Убраны тени, минимизированы отступы
- Создан отдельный composable useProfileAvatarForm для avatar+name
- Два новых компонента: ChangeEmailDialog и ChangePasswordDialog

refactor: split profile editing into 3 separate forms with modal dialogs

## Task 2 (Create list component)

Context: 
- There is a good styled list in the settings page

Description:
- I need global component for this list
- Prepare types for props
- Action use in the props
- Add props list - create the structure the same
- In the item add props detail, end, icon, label, caption 
- Follow FSD structure
