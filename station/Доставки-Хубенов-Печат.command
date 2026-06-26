#!/bin/bash
# Доставки Хубенов — станция за печат (macOS)
# Двойно щракване отваря приложението в режим за АВТОМАТИЧЕН печат:
# всеки етикет се печата директно на принтера по подразбиране, без диалог.
open -na "Google Chrome" --args \
  --kiosk-printing \
  --user-data-dir="$HOME/Library/Application Support/HubenovStation" \
  "https://hubenov.delivery/op/scan"
