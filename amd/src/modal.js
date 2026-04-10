/* eslint-disable linebreak-style, no-console */
define(['jquery'], function ($) {
  let confirmCallback = null;
  let confirmOpen = false;
  let cleanupCallback = null;
  let isAnimating = false;
  let $modal = null;
  let $backdrop = null;
  let lastFocusedElement = null;

  /**
   * Показывает модальное окно и наполняет его контентом (если передан).
   * @param {string} [contentHtml] - HTML для динамического наполнения модалки
   */
  function showModal(contentHtml) {
    if (isAnimating) {
      return;
    }
    isAnimating = true;
    lastFocusedElement = document.activeElement;

    $modal = $modal || $('#stories-modal');
    if (contentHtml) {
      $modal.find('[data-region="stories-modal-body"]').html(contentHtml);
    }

    if (!$backdrop) {
      $backdrop = $('<div class="modal-backdrop fade"></div>').appendTo(
        document.body
      );
    }

    // Показываем с анимацией
    requestAnimationFrame(() => {
      $modal.addClass('show').css('display', 'block').attr({
        'aria-modal': 'true',
        role: 'dialog',
      });
      $backdrop.addClass('show');
      $('body').addClass('modal-open');

      // Фокус на первый интерактивный элемент
      const $firstFocusable = $modal
        .find(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        .first();
      if ($firstFocusable.length) {
        $firstFocusable.focus();
      } else {
        $modal.focus();
      }

      setTimeout(() => {
        isAnimating = false;
      }, 300);
    });
  }

  /**
   * Скрывает модальное окно и убирает backdrop.
   */
  function hideModal() {
    if (isAnimating || !$modal) {
      return;
    }
    isAnimating = true;

    $modal.removeClass('show');
    if ($backdrop) {
      $backdrop.removeClass('show');
    }

    setTimeout(() => {
      $modal.css('display', '').removeAttr('aria-modal role');
      if ($backdrop) {
        $backdrop.remove();
        $backdrop = null;
      }
      $('body').removeClass('modal-open');

      // Возвращаем фокус
      if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
      }

      if (cleanupCallback) {
        cleanupCallback();
      }

      isAnimating = false;
    }, 300);
  }

  /**
   * Устанавливает callback для подтверждения закрытия
   * @param {Function} callback - функция, которая вернет true, если нужно подтверждение
   */
  function setConfirmCallback(callback) {
    confirmCallback = callback;
  }

  /**
   * Устанавливает callback для очистки при закрытии
   * @param {Function} callback - функция очистки
   */
  function setCleanupCallback(callback) {
    cleanupCallback = callback;
  }

  /**
   * Показывает кастомное модальное окно подтверждения
   * @param {string} text - текст подтверждения
   * @param {Function} onConfirm - callback при подтверждении
   */
  function showConfirmModal(text, onConfirm) {
    if (confirmOpen) {
      return;
    }
    confirmOpen = true;
    const modalEl = $('.stories-confirm-modal');
    modalEl.find('.stories-confirm-modal__text').text(text);
    modalEl.show();

    /**
     * Закрывает окно подтверждения
     */
    function close() {
      modalEl.hide();
      confirmOpen = false;
    }

    modalEl
      .find('.stories-confirm-modal__btn--ok')
      .off('click')
      .on('click', function () {
        close();
        if (onConfirm) {
          onConfirm();
        }
      });

    modalEl
      .find(
        '.stories-confirm-modal__btn--cancel, .stories-confirm-modal__overlay'
      )
      .off('click')
      .on('click', close);
  }

  /**
   * Пытается закрыть модальное окно, проверяя необходимость подтверждения
   * @param {Event} e - событие, вызвавшее закрытие
   */
  function tryClose(e) {
    if (e) {
      e.preventDefault();
    }

    if (confirmCallback && confirmCallback()) {
      showConfirmModal(
        'Вы действительно хотите закрыть окно? Весь добавленный контент будет удалён.',
        hideModal
      );
    } else {
      hideModal();
    }
  }

  return {
    init: function () {
      $(document).on(
        'click',
        '[data-action="open-stories-editor"]',
        function (e) {
          e.preventDefault();
          showModal();
        }
      );

      $(document).on(
        'click',
        '#stories-modal [data-action="close-modal"]',
        tryClose
      );

      // Клик вне .modal-dialog закрывает модалку
      $(document).on('mousedown', '#stories-modal', function (e) {
        if ($(e.target).is('#stories-modal')) {
          tryClose(e);
        }
      });

      // Обработка Escape
      $(document).on('keydown', function (e) {
        if (e.key === 'Escape' && $('#stories-modal').is(':visible')) {
          tryClose(e);
        }
      });

      // Trap focus внутри модалки
      $(document).on('keydown', '#stories-modal', function (e) {
        if (e.key === 'Tab') {
          const $focusable = $(this).find(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const $first = $focusable.first();
          const $last = $focusable.last();

          if (e.shiftKey && document.activeElement === $first[0]) {
            e.preventDefault();
            $last.focus();
          } else if (!e.shiftKey && document.activeElement === $last[0]) {
            e.preventDefault();
            $first.focus();
          }
        }
      });

      window.StoriesModal = {
        show: showModal,
        hide: hideModal,
        setConfirmCallback: setConfirmCallback,
        setCleanupCallback: setCleanupCallback,
      };

      var $stories = $('.stories-nav');
      var $usernav = $('#usernavigation');
      if ($stories.length && $usernav.length) {
        $usernav.prepend($stories);
      }
    },
  };
});
