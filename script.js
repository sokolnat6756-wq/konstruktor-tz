(function () {
  "use strict";

  var form = document.getElementById("tz-form");
  var actionsList = document.getElementById("actions-list");
  var addActionBtn = document.getElementById("add-action");
  var clearBtn = document.getElementById("clear-btn");
  var resultArea = document.getElementById("result");
  var actionCounter = 0;
  var hasBuiltOnce = false;

  var FEATURE_LABELS = {
    auth: "Регистрация / вход",
    payment: "Оплата",
    storage: "Сохранение данных",
    ai: "AI / нейросеть"
  };

  var FEATURE_VALUES = {
    no: "Нет",
    yes: "Да",
    unknown: "Пока не знаю"
  };

  function trimValue(value) {
    return (value || "").trim();
  }

  function hasContent(value) {
    return trimValue(value).length > 0;
  }

  function preserveMultiline(value) {
    return String(value || "").replace(/\r\n/g, "\n").trimEnd();
  }

  function createActionRow(initialValue) {
    actionCounter += 1;
    var id = "action-" + actionCounter;
    var row = document.createElement("div");
    row.className = "action-row";
    row.dataset.actionRow = "true";

    var input = document.createElement("input");
    input.type = "text";
    input.id = id;
    input.name = "actions";
    input.autocomplete = "off";
    input.placeholder = "Например: добавить привычку";
    input.setAttribute("aria-label", "Действие пользователя");
    if (initialValue) {
      input.value = initialValue;
    }

    var removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn btn--danger-soft";
    removeBtn.textContent = "Удалить";
    removeBtn.setAttribute("aria-label", "Удалить действие");
    removeBtn.addEventListener("click", function () {
      var rows = actionsList.querySelectorAll("[data-action-row]");
      if (rows.length <= 1) {
        input.value = "";
        input.focus();
        return;
      }
      row.remove();
      updateRemoveButtons();
    });

    row.appendChild(input);
    row.appendChild(removeBtn);
    actionsList.appendChild(row);
    updateRemoveButtons();
    return input;
  }

  function updateRemoveButtons() {
    var rows = actionsList.querySelectorAll("[data-action-row]");
    rows.forEach(function (row) {
      var btn = row.querySelector("button");
      if (!btn) return;
      btn.disabled = rows.length <= 1;
    });
  }

  function getActions() {
    var inputs = actionsList.querySelectorAll('input[name="actions"]');
    var list = [];
    inputs.forEach(function (input) {
      var value = trimValue(input.value);
      if (value) list.push(value);
    });
    return list;
  }

  function getSelectedDevices() {
    var boxes = form.querySelectorAll('input[name="devices"]:checked');
    var values = [];
    boxes.forEach(function (box) {
      values.push(box.value);
    });
    return values;
  }

  function clearFieldError(fieldEl, errorEl) {
    if (fieldEl) fieldEl.classList.remove("field--invalid");
    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = "";
    }
  }

  function showFieldError(fieldEl, errorEl, message, focusTarget) {
    if (fieldEl) fieldEl.classList.add("field--invalid");
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = message;
    }
    return focusTarget || null;
  }

  function clearAllErrors() {
    form.querySelectorAll(".field--invalid").forEach(function (el) {
      el.classList.remove("field--invalid");
    });
    form.querySelectorAll(".action-row--invalid").forEach(function (el) {
      el.classList.remove("action-row--invalid");
    });
    ["product-idea-error", "audience-error", "user-task-error", "actions-error"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.hidden = true;
        el.textContent = "";
      }
    });
  }

  function validateForm() {
    clearAllErrors();
    var firstInvalid = null;

    var idea = document.getElementById("product-idea");
    var audience = document.getElementById("audience");
    var userTask = document.getElementById("user-task");

    if (!hasContent(idea.value)) {
      firstInvalid =
        showFieldError(
          idea.closest(".field"),
          document.getElementById("product-idea-error"),
          "Заполните поле: опишите, что хотите создать.",
          idea
        ) || firstInvalid;
    }

    if (!hasContent(audience.value)) {
      var focusAudience = showFieldError(
        audience.closest(".field"),
        document.getElementById("audience-error"),
        "Укажите, для кого создаётся продукт.",
        audience
      );
      if (!firstInvalid) firstInvalid = focusAudience;
    }

    if (!hasContent(userTask.value)) {
      var focusTask = showFieldError(
        userTask.closest(".field"),
        document.getElementById("user-task-error"),
        "Опишите, какую задачу пользователя решает продукт.",
        userTask
      );
      if (!firstInvalid) firstInvalid = focusTask;
    }

    var actions = getActions();
    if (actions.length === 0) {
      var firstActionInput = actionsList.querySelector('input[name="actions"]');
      var actionsField = document.getElementById("actions-field");
      var actionsError = document.getElementById("actions-error");
      if (actionsField) actionsField.classList.add("field--invalid");
      if (firstActionInput) {
        firstActionInput.closest(".action-row").classList.add("action-row--invalid");
      }
      if (actionsError) {
        actionsError.hidden = false;
        actionsError.textContent = "Добавьте хотя бы одно основное действие пользователя.";
      }
      if (!firstInvalid) firstInvalid = firstActionInput;
    }

    return firstInvalid;
  }

  function sectionOrClarify(title, value, clarifyText, clarifications) {
    if (hasContent(value)) {
      return "## " + title + "\n\n" + preserveMultiline(value) + "\n";
    }
    clarifications.push(clarifyText);
    return "## " + title + "\n\nТребуется уточнение.\n";
  }

  function listSection(title, items, emptyClarify, clarifications) {
    if (items.length > 0) {
      var body = items.map(function (item) {
        return "- " + item;
      }).join("\n");
      return "## " + title + "\n\n" + body + "\n";
    }
    clarifications.push(emptyClarify);
    return "## " + title + "\n\nТребуется уточнение.\n";
  }

  function featureLine(key, value) {
    return "- " + FEATURE_LABELS[key] + ": " + FEATURE_VALUES[value];
  }

  function buildDocument(data) {
    var clarifications = [];
    var parts = [];

    var title = hasContent(data.projectName)
      ? data.projectName
      : "Проект без названия";

    parts.push("# " + title + "\n");

    // 1. Название и описание
    parts.push("## 1. Название и описание продукта\n");
    parts.push("- Название: " + (hasContent(data.projectName) ? data.projectName : "не указано") + "\n");
    parts.push("- Тип продукта: " + data.productType + "\n");
    if (hasContent(data.productIdea)) {
      parts.push("\n### Описание\n\n" + preserveMultiline(data.productIdea) + "\n");
    } else {
      parts.push("\nОписание не указано.\n");
      clarifications.push("Что именно нужно создать? Опишите продукт подробнее.");
    }

    // 2. Аудитория
    parts.push("\n" + sectionOrClarify(
      "2. Целевая аудитория",
      data.audience,
      "Для кого создаётся продукт?",
      clarifications
    ));

    // 3. Задача и результат
    parts.push("## 3. Задача и ожидаемый результат\n");
    if (hasContent(data.userTask)) {
      parts.push("### Задача пользователя\n\n" + preserveMultiline(data.userTask) + "\n");
    } else {
      parts.push("### Задача пользователя\n\nТребуется уточнение.\n");
      clarifications.push("Какую задачу пользователя должен решать продукт?");
    }
    if (hasContent(data.outputResult)) {
      parts.push("\n### Ожидаемый результат для пользователя\n\n" + preserveMultiline(data.outputResult) + "\n");
    } else {
      parts.push("\n### Ожидаемый результат для пользователя\n\nТребуется уточнение.\n");
      clarifications.push("Какой результат пользователь должен получать?");
    }

    // 4. Состав первой версии
    parts.push("\n## 4. Состав первой версии\n");
    if (data.actions.length > 0) {
      parts.push("### Основные действия пользователя\n\n");
      data.actions.forEach(function (action) {
        parts.push("- " + action + "\n");
      });
    } else {
      parts.push("Основные действия не указаны.\n");
      clarifications.push("Какие основные действия пользователь сможет выполнять в первой версии?");
    }

    // 5. Сценарий
    parts.push("\n## 5. Основной пользовательский сценарий\n\n");
    if (data.actions.length > 0) {
      parts.push("Последовательность шагов отдельно не описана. Ниже перечислены заявленные действия первой версии — порядок выполнения нужно уточнить при необходимости:\n\n");
      data.actions.forEach(function (action, index) {
        parts.push((index + 1) + ". " + action + "\n");
      });
      clarifications.push("Каков основной пользовательский сценарий (последовательность шагов от входа до результата)?");
    } else {
      parts.push("Пользовательский сценарий не описан — его нужно уточнить.\n");
      clarifications.push("Опишите основной пользовательский сценарий по шагам.");
    }

    // 6. Страницы
    parts.push("\n" + sectionOrClarify(
      "6. Страницы, экраны или разделы",
      data.pages,
      "Какие страницы, экраны или разделы нужны в первой версии?",
      clarifications
    ));

    // 7. Данные и результаты
    parts.push("## 7. Вводимые данные и результаты\n");
    if (hasContent(data.inputData)) {
      parts.push("### Вводимые данные\n\n" + preserveMultiline(data.inputData) + "\n");
    } else {
      parts.push("### Вводимые данные\n\nТребуется уточнение.\n");
      clarifications.push("Какие данные пользователь вводит?");
    }
    if (hasContent(data.outputResult)) {
      parts.push("\n### Результаты\n\n" + preserveMultiline(data.outputResult) + "\n");
    } else {
      parts.push("\n### Результаты\n\nТребуется уточнение.\n");
    }

    // 8. Регистрация, оплата, данные, AI
    parts.push("\n## 8. Регистрация, оплата, сохранение данных и AI\n\n");
    parts.push(featureLine("auth", data.featAuth) + "\n");
    parts.push(featureLine("payment", data.featPayment) + "\n");
    parts.push(featureLine("storage", data.featStorage) + "\n");
    parts.push(featureLine("ai", data.featAi) + "\n");

    if (data.featAuth === "unknown") {
      clarifications.push("Нужна ли регистрация / вход пользователя?");
    }
    if (data.featPayment === "unknown") {
      clarifications.push("Нужна ли оплата?");
    }
    if (data.featStorage === "unknown") {
      clarifications.push("Нужно ли сохранение данных между сессиями?");
    }
    if (data.featAi === "unknown") {
      clarifications.push("Нужны ли функции на базе AI / нейросети?");
    }

    var needsServices = [];
    if (data.featAuth === "yes") needsServices.push("авторизацию");
    if (data.featPayment === "yes") needsServices.push("платежи");
    if (data.featAi === "yes") needsServices.push("AI");

    if (needsServices.length > 0) {
      parts.push(
        "\nДля пунктов («" +
          needsServices.join("», «") +
          "») необходимо отдельно определить сервисы и способ безопасного подключения. Не запрашивайте и не встраивайте пароли, токены или секретные ключи в код без отдельной безопасной настройки.\n"
      );
    }

    // 9. Дизайн
    parts.push("\n## 9. Дизайн и адаптивность\n");
    if (hasContent(data.designWish)) {
      parts.push("### Стиль, цвета и настроение\n\n" + preserveMultiline(data.designWish) + "\n");
    } else {
      parts.push("### Стиль, цвета и настроение\n\nТребуется уточнение.\n");
      clarifications.push("Какой желаемый стиль, цвета и настроение у продукта?");
    }
    if (hasContent(data.references)) {
      parts.push("\n### Референсы\n\n" + preserveMultiline(data.references) + "\n");
    } else {
      parts.push("\n### Референсы\n\nНе указаны.\n");
    }
    if (data.devices.length > 0) {
      parts.push("\n### Где будут пользоваться\n\n" + data.devices.join(", ") + "\n");
    } else {
      parts.push("\n### Где будут пользоваться\n\nТребуется уточнение.\n");
      clarifications.push("Где будут пользоваться продуктом: компьютер, телефон или оба?");
    }

    // 10. Технологии
    parts.push("\n## 10. Технологии и ограничения\n");
    if (hasContent(data.tech)) {
      parts.push("### Технологии / платформа\n\n" + preserveMultiline(data.tech) + "\n");
    } else {
      parts.push(
        "### Технологии / платформа\n\nПредложи подходящие технологии и объясни выбор перед реализацией.\n"
      );
    }
    if (hasContent(data.constraints)) {
      parts.push("\n### Дополнительные ограничения и пожелания\n\n" + preserveMultiline(data.constraints) + "\n");
    } else {
      parts.push("\n### Дополнительные ограничения и пожелания\n\nНе указаны.\n");
    }

    // 11. Вне объёма
    parts.push("\n" + sectionOrClarify(
      "11. Что не входит в первую версию",
      data.outOfScope,
      "Что точно не нужно включать в первую версию?",
      clarifications
    ));

    // 12. Критерии приёмки
    parts.push("## 12. Критерии приёмки\n");
    if (hasContent(data.successSign)) {
      parts.push("### Как понять, что продукт работает\n\n" + preserveMultiline(data.successSign) + "\n");
    } else {
      parts.push("### Как понять, что продукт работает\n\nТребуется уточнение.\n");
      clarifications.push("Как пользователь поймёт, что продукт работает?");
    }
    if (hasContent(data.mustWork)) {
      parts.push("\n### Обязательные успешные действия\n\n" + preserveMultiline(data.mustWork) + "\n");
    } else {
      parts.push("\n### Обязательные успешные действия\n\nТребуется уточнение.\n");
      clarifications.push("Какие действия обязательно должны успешно выполняться?");
    }

    // 13. Уточнения
    parts.push("\n## 13. Вопросы, которые нужно уточнить\n\n");
    if (clarifications.length > 0) {
      clarifications.forEach(function (q, i) {
        parts.push((i + 1) + ". " + q + "\n");
      });
    } else {
      parts.push("Существенных пробелов по заполненным ответам не выявлено. При реализации всё равно уточняйте детали, если формулировки неоднозначны.\n");
    }

    // 14. Инструкция
    parts.push("\n## 14. Инструкция приложению для разработки\n\n");
    parts.push(
      "Сначала изучи требования. Если есть существенные неопределённости, задай уточняющие вопросы. Затем предложи план реализации первой версии. Не добавляй функции вне согласованного объёма. После реализации объясни, как запустить проект и проверить критерии приёмки. Не выполняй публикацию, commit или push без отдельной команды.\n"
    );

    return parts.join("").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }

  function collectData() {
    return {
      projectName: trimValue(document.getElementById("project-name").value),
      productIdea: trimValue(document.getElementById("product-idea").value),
      productType: document.getElementById("product-type").value,
      audience: trimValue(document.getElementById("audience").value),
      userTask: trimValue(document.getElementById("user-task").value),
      actions: getActions(),
      pages: trimValue(document.getElementById("pages").value),
      inputData: trimValue(document.getElementById("input-data").value),
      outputResult: trimValue(document.getElementById("output-result").value),
      featAuth: document.getElementById("feat-auth").value,
      featPayment: document.getElementById("feat-payment").value,
      featStorage: document.getElementById("feat-storage").value,
      featAi: document.getElementById("feat-ai").value,
      outOfScope: trimValue(document.getElementById("out-of-scope").value),
      designWish: trimValue(document.getElementById("design-wish").value),
      references: trimValue(document.getElementById("references").value),
      devices: getSelectedDevices(),
      tech: trimValue(document.getElementById("tech").value),
      constraints: trimValue(document.getElementById("constraints").value),
      successSign: trimValue(document.getElementById("success-sign").value),
      mustWork: trimValue(document.getElementById("must-work").value)
    };
  }

  function formHasUserData() {
    var controls = form.querySelectorAll("input, textarea, select");
    for (var i = 0; i < controls.length; i++) {
      var el = controls[i];
      if (el.type === "checkbox") {
        if (el.checked) return true;
        continue;
      }
      if (el.tagName === "SELECT") {
        if (el.id.indexOf("feat-") === 0) {
          if (el.value !== "unknown") return true;
        } else if (el.id === "product-type") {
          if (el.value !== "сайт") return true;
        }
        continue;
      }
      if (hasContent(el.value)) return true;
    }
    if (hasContent(resultArea.value)) return true;
    return false;
  }

  function resetForm() {
    form.reset();
    actionsList.innerHTML = "";
    actionCounter = 0;
    createActionRow();
    createActionRow();
    createActionRow();
    resultArea.value = "";
    hasBuiltOnce = false;
    clearAllErrors();
    document.getElementById("product-idea").focus();
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var firstInvalid = validateForm();
    if (firstInvalid) {
      firstInvalid.focus();
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (hasBuiltOnce && hasContent(resultArea.value)) {
      var ok = window.confirm(
        "Готовое ТЗ будет собрано заново. Ручные правки в поле результата будут заменены. Продолжить?"
      );
      if (!ok) return;
    }

    var doc = buildDocument(collectData());
    resultArea.value = doc;
    hasBuiltOnce = true;
    resultArea.focus();
    resultArea.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  addActionBtn.addEventListener("click", function () {
    var input = createActionRow();
    input.focus();
  });

  clearBtn.addEventListener("click", function () {
    if (formHasUserData()) {
      var ok = window.confirm("Очистить форму и готовое ТЗ? Введённые данные будут удалены.");
      if (!ok) return;
    }
    resetForm();
  });

  // Стартовые три пустых поля действий (удобно для 3–5 пунктов)
  createActionRow();
  createActionRow();
  createActionRow();
})();
