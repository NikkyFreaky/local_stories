/* eslint-disable linebreak-style, no-console */
import $ from 'jquery';

  let confirmCallback = null;
  let confirmOpen = false;
  let cleanupCallback = null;
  let isAnimatingCreate = false;
  let isAnimatingView = false;
  let $createModal = null;
  let $viewModal = null;
  let $backdrop = null;
  let createLastFocusedElement = null;
  let viewLastFocusedElement = null;

  /**
   * @returns {number}
   */
  function visibleModalsCount() {
    return $('.modal.show').length;
  }

  /**
   * @param {jQuery} $target
   * @param {HTMLElement|null} lastFocusedElement
   * @param {Function} unlock
   */
  function showGenericModal($target, lastFocusedElement, unlock) {
    if (!$backdrop) {
      $backdrop = $('<div class="modal-backdrop fade"></div>').appendTo(
        document.body
      );
    }

    requestAnimationFrame(() => {
      $target.addClass('show').css('display', 'block').attr({
        'aria-modal': 'true',
        role: 'dialog',
      });
      $backdrop.addClass('show');
      $('body').addClass('modal-open');

      const $firstFocusable = $target
        .find(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        .first();
      if ($firstFocusable.length) {
        $firstFocusable.focus();
      } else {
        $target.focus();
      }

      setTimeout(() => {
        unlock();
      }, 300);
    });
  }

  /**
   * @param {jQuery} $target
   * @param {HTMLElement|null} lastFocusedElement
   * @param {Function} unlock
   * @param {Function|null} onClosed
   */
  function hideGenericModal($target, lastFocusedElement, unlock, onClosed) {
    $target.removeClass('show');

    setTimeout(() => {
      $target.css('display', '').removeAttr('aria-modal role');

      if (visibleModalsCount() === 0) {
        if ($backdrop) {
          $backdrop.removeClass('show');
          $backdrop.remove();
          $backdrop = null;
        }
        $('body').removeClass('modal-open');
      }

      if (lastFocusedElement) {
        lastFocusedElement.focus();
      }

      if (onClosed) {
        onClosed();
      }

      unlock();
    }, 300);
  }

  /**
   * Показывает модальное окно и наполняет его контентом (если передан).
   * @param {string} [contentHtml] - HTML для динамического наполнения модалки
   */
  function showModal(contentHtml) {
    if (isAnimatingCreate) {
      return;
    }
    isAnimatingCreate = true;
    createLastFocusedElement = document.activeElement;

    $createModal = $createModal || $('#stories-modal');
    if (contentHtml) {
      $createModal.find('[data-region="stories-create-body"]').html(contentHtml);
    }
    showGenericModal($createModal, createLastFocusedElement, function () {
      isAnimatingCreate = false;
    });
  }

  /**
   * Скрывает модальное окно и убирает backdrop.
   */
  function hideModal() {
    if (isAnimatingCreate || !$createModal) {
      return;
    }
    isAnimatingCreate = true;

    hideGenericModal(
      $createModal,
      createLastFocusedElement,
      function () {
        isAnimatingCreate = false;
      },
      function () {
        createLastFocusedElement = null;
        if (cleanupCallback) {
          cleanupCallback();
        }
      }
    );
  }

  /**
   * Показывает модалку просмотра историй.
   */
  function showViewModal() {
    if (isAnimatingView) {
      return;
    }
    isAnimatingView = true;
    viewLastFocusedElement = document.activeElement;
    $viewModal = $viewModal || $('#stories-view-modal');
    showGenericModal($viewModal, viewLastFocusedElement, function () {
      isAnimatingView = false;
    });
  }

  /**
   * Скрывает модалку просмотра историй.
   */
  function hideViewModal() {
    if (isAnimatingView || !$viewModal) {
      return;
    }
    isAnimatingView = true;
    hideGenericModal($viewModal, viewLastFocusedElement, function () {
      isAnimatingView = false;
      viewLastFocusedElement = null;
    });
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

export const init = () => {
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

      $(document).on(
        'click',
        '#stories-view-modal [data-action="close-modal"]',
        function (e) {
          e.preventDefault();
          hideViewModal();
        }
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
          return;
        }

        if (e.key === 'Escape' && $('#stories-view-modal').is(':visible')) {
          e.preventDefault();
          hideViewModal();
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

      window.StoriesViewModal = {
        show: showViewModal,
        hide: hideViewModal,
      };

      var $stories = $('.stories-nav');
      var $usernav = $('#usernavigation');
      if ($stories.length && $usernav.length) {
        $usernav.prepend($stories);
      }
};
