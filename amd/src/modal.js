/* eslint-disable linebreak-style, no-console */
define(['jquery'], function ($) {
  /**
   * Показывает модальное окно и наполняет его контентом (если передан).
   * @param {string} [contentHtml] - HTML для динамического наполнения модалки
   */
  function showModal(contentHtml) {
    var $modal = $('#stories-modal');
    if (contentHtml) {
      $modal.find('[data-region="stories-modal-body"]').html(contentHtml);
    }
    $modal.addClass('show').css('display', 'block').attr('aria-modal', 'true');
    if (!$('.modal-backdrop').length) {
      $('<div class="modal-backdrop fade show"></div>').appendTo(document.body);
    }
    $('body').addClass('modal-open');
  }

  /**
   * Скрывает модальное окно и убирает backdrop.
   */
  function hideModal() {
    var $modal = $('#stories-modal');
    $modal.removeClass('show').css('display', '').removeAttr('aria-modal');
    $('.modal-backdrop').remove();
    $('body').removeClass('modal-open');
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
        function (e) {
          e.preventDefault();
          hideModal();
        }
      );
      // Клик вне .modal-dialog закрывает модалку
      $(document).on('mousedown', '#stories-modal', function (e) {
        if ($(e.target).is('#stories-modal')) {
          hideModal();
        }
      });
      window.StoriesModal = {show: showModal, hide: hideModal};
    },
  };
});
