#!/bin/bash
# Скрипт копирования

SOURCE="/Users/Seafarer-Documents-Manager"
# Замените 'DISK_NAME' на реальное имя вашего внешнего диска
DEST="/Volumes/E:/2026/SDM 2.3.11"

echo "Жека начинает копирование проекта..."

if [ -d "$SOURCE" ]; then
    mkdir -p "$DEST"
    cp -R "$SOURCE/" "$DEST"
    echo "Копирование завершено успешно!"
else
    echo "Ошибка: Исходная папка не найдена."
fi

# Чтобы окно не закрылось сразу
read -p "Нажмите Enter, чтобы закончить..."