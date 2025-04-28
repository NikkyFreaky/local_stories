/* eslint-disable linebreak-style */
define(['jquery'], function ($) {
  return {
    init: function () {
      const modal = $('#stories-modal');
      const fileInput = modal.find('.stories-file-input');
      const dropzone = modal.find('.stories-dropzone');
      const previewContainer = modal.find('.stories-preview-container');
      const previewImage = modal.find('.stories-preview-image');
      const previewVideo = modal.find('.stories-preview-video');

      // Обработка выбора файла
      fileInput.on('change', function (e) {
        const file = e.target.files[0];
        if (file) {
          handleFile(file);
        }
      });

      // Обработка drag & drop
      dropzone.on('dragover', function (e) {
        e.preventDefault();
        $(this).addClass('stories-dropzone-active');
      });

      dropzone.on('dragleave', function (e) {
        e.preventDefault();
        $(this).removeClass('stories-dropzone-active');
      });

      dropzone.on('drop', function (e) {
        e.preventDefault();
        $(this).removeClass('stories-dropzone-active');
        const file = e.originalEvent.dataTransfer.files[0];
        if (file) {
          handleFile(file);
        }
      });

      /**
       * Обрабатывает загруженный файл и отображает его превью
       * @param {File} file Загруженный файл
       */
      function handleFile(file) {
        const reader = new FileReader();

        if (file.type.startsWith('image/')) {
          reader.onload = function (e) {
            previewImage.attr('src', e.target.result);
            previewImage.removeClass('d-none');
            previewVideo.addClass('d-none');
            dropzone.addClass('d-none');
            previewContainer.removeClass('d-none');
          };
          reader.readAsDataURL(file);
        } else if (file.type.startsWith('video/')) {
          const videoUrl = URL.createObjectURL(file);
          previewVideo.attr('src', videoUrl);
          previewVideo.removeClass('d-none');
          previewImage.addClass('d-none');
          dropzone.addClass('d-none');
          previewContainer.removeClass('d-none');
        }
      }

      // Обработка закрытия модального окна
      modal.find('[data-action="close-modal"]').on('click', function () {
        resetModal();
      });

      /**
       * Сбрасывает состояние модального окна
       */
      function resetModal() {
        fileInput.val('');
        previewImage.attr('src', '');
        previewVideo.attr('src', '');
        previewImage.addClass('d-none');
        previewVideo.addClass('d-none');
        previewContainer.addClass('d-none');
        dropzone.removeClass('d-none');
      }
    },
  };
});
