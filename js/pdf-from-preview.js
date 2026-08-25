(() => {
  const button = document.querySelector('#printQuote');
  const pagesRoot = document.querySelector('#quotePages');
  const openQuoteButton = document.querySelector('#openQuote');
  if (!button || !pagesRoot) return;

  const ORIGINAL_NETWORK_IMAGE = 'assets/images/swiss-network-original.jpg';

  const safeFileName = value => String(value || 'Cliente')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Cliente';

  const waitForImages = async root => {
    const images = [...root.querySelectorAll('img')];
    await Promise.all(images.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(resolve => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
    }));
  };

  function normalizePreview() {
    const networkImage = pagesRoot.querySelector('.ref-network--image img');
    if (networkImage) {
      networkImage.src = ORIGINAL_NETWORK_IMAGE;
      networkImage.alt = 'Hoy contamos con · Swiss Medical';
    }

    pagesRoot.querySelectorAll('.ref-technical').forEach(page => page.remove());

    const pageCount = pagesRoot.querySelectorAll('.quote-page').length;
    const toolbarText = document.querySelector('.dialog-toolbar small');
    if (toolbarText && pageCount) {
      toolbarText.textContent = `${pageCount} página${pageCount === 1 ? '' : 's'} de propuesta · alcance oficial se adjunta al descargar`;
    }
  }

  if (openQuoteButton) {
    openQuoteButton.addEventListener('click', () => {
      window.setTimeout(normalizePreview, 0);
    });
  }

  async function downloadPreviewAsPdf() {
    normalizePreview();

    const JsPDF = window.jspdf?.jsPDF;
    const capture = window.html2canvas;
    const pages = [...pagesRoot.querySelectorAll('.quote-page')];

    if (!JsPDF || !capture) {
      alert('No se pudo cargar el generador visual del PDF. Recargá la página e intentá nuevamente.');
      return;
    }
    if (!pages.length) {
      alert('Primero abrí la vista previa de la cotización.');
      return;
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Generando PDF...';

    try {
      if (document.fonts?.ready) await document.fonts.ready;
      await waitForImages(pagesRoot);

      const pdf = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
      const pageWidth = 210;
      const pageHeight = 297;
      const scale = Math.max(2, Math.min(3, window.devicePixelRatio || 2));

      for (let index = 0; index < pages.length; index++) {
        const page = pages[index];
        const canvas = await capture(page, {
          scale,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
          imageTimeout: 15000,
          removeContainer: true
        });

        if (index > 0) pdf.addPage('a4', 'portrait');
        const image = canvas.toDataURL('image/jpeg', 0.97);
        pdf.addImage(image, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }

      const clientName = document.querySelector('#clientName')?.value;
      pdf.save(`Cotizacion Swiss Medical (${safeFileName(clientName)}).pdf`);
    } catch (error) {
      console.error('No se pudo generar el PDF desde el preview:', error);
      alert('No se pudo generar el PDF. Recargá la página e intentá nuevamente.');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    downloadPreviewAsPdf();
  }, { capture: true });
})();
