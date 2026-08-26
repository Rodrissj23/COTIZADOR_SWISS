(() => {
  const button = document.querySelector('#printQuote');
  const pagesRoot = document.querySelector('#quotePages');
  const openQuoteButton = document.querySelector('#openQuote');
  if (!button || !pagesRoot) return;

  const PDF_LIB_URL = 'assets/vendor/pdf-lib.min.js';
  const INTRO_PDF_FILE = 'assets/static/swiss-intro-original.pdf';
  const INTRO_PAGE_FILES = [
    'assets/static/swiss-intro-page1.jpg',
    'assets/static/swiss-intro-page2.jpg'
  ];
  const COVERAGE_FILES = {
    'AMBU1': 'AMBU1 08_2026.pdf',
    'AMBU2': 'AMBU2 08_2026.pdf',
    'INTER1': 'INTER1 08_2026.pdf',
    'S1': 'S1 08_2026.pdf',
    'S2': 'S2 08_2026.pdf',
    'SMG02': 'SMG02 08_2026.pdf',
    'SMG20': 'SMG20 08_2026.pdf',
    'SMG30': 'SMG30 08_2026.pdf',
    'SMG40': 'SMG40 08_2026.pdf',
    'SMG50': 'SMG50 08_2026.pdf',
    'SMG60': 'SMG60 08_2026.pdf',
    'SMG70': 'SMG70 08_2026.pdf',
    'SPORT': 'SPORT 08_2026.pdf',
    'SPORT+': 'SPORT+ 08_2026.pdf',
    'SPORT S': 'SPORT-S 08_2026.pdf'
  };

  const safeFileName = value => String(value || 'Cliente')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Cliente';

  const normalizePlanName = value => String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  const waitForImages = async root => {
    const images = [...root.querySelectorAll('img')];
    await Promise.all(images.map(async img => {
      if (img.complete && img.naturalWidth > 0) {
        if (img.decode) {
          try { await img.decode(); } catch {}
        }
        return;
      }
      await new Promise(resolve => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
      if (img.decode) {
        try { await img.decode(); } catch {}
      }
    }));
  };

  function looksLikePdf(bytes) {
    return bytes?.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  }

  function installOriginalIntroPages() {
    const coverPage = pagesRoot.querySelector('.ref-cover');
    const networkPage = pagesRoot.querySelector('.ref-network--image');
    if (!coverPage || !networkPage) return;

    const pages = [
      [coverPage, INTRO_PAGE_FILES[0], 'Portada original de Swiss Medical'],
      [networkPage, INTRO_PAGE_FILES[1], 'Hoy contamos con · Swiss Medical']
    ];

    pages.forEach(([page, src, alt], index) => {
      page.classList.add('ref-intro-original', `ref-intro-original--${index + 1}`);
      const existing = page.querySelector(`img[data-original-intro="${index + 1}"]`);
      if (existing?.getAttribute('src') === src) return;
      page.innerHTML = `<img src="${src}" alt="${alt}" data-original-intro="${index + 1}" width="${index === 0 ? 1859 : 1860}" height="2631">`;
    });
  }

  async function normalizePreview() {
    // Las imágenes de preview son los JPEG originales extraídos sin
    // recomprimir de las páginas 1 y 2 del PDF entregado por el usuario.
    installOriginalIntroPages();

    // La propuesta comercial no incorpora resúmenes de cobertura reconstruidos.
    // El alcance médico exacto se adjunta luego como PDF oficial del plan.
    pagesRoot.querySelectorAll('.ref-technical').forEach(page => page.remove());

    const pageCount = pagesRoot.querySelectorAll('.quote-page').length;
    const toolbarText = document.querySelector('.dialog-toolbar small');
    if (toolbarText && pageCount) {
      toolbarText.textContent = `${pageCount} página${pageCount === 1 ? '' : 's'} de propuesta · 2 hojas originales · alcance oficial exacto incluido en la descarga`;
    }

    await waitForImages(pagesRoot);
    const introImages = [...pagesRoot.querySelectorAll('img[data-original-intro]')];
    introImages.forEach((image, index) => {
      if (!image.complete || image.naturalWidth < 1800 || image.naturalHeight < 2600) {
        throw new Error(`No se pudo cargar la hoja original ${index + 1} de Swiss Medical en máxima calidad.`);
      }
    });
  }

  // quote-reference.js arma la estructura base. Esta capa sustituye las dos
  // primeras hojas recreadas por las hojas originales y elimina cualquier
  // hoja técnica sintética.
  if (typeof window.buildQuote === 'function') {
    const buildQuoteBase = window.buildQuote;
    window.buildQuote = function(...args) {
      const result = buildQuoteBase.apply(this, args);
      Promise.resolve().then(normalizePreview).catch(error => {
        console.error('No se pudieron instalar las hojas originales:', error);
      });
      return result;
    };
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (window.PDFLib) return resolve();
      const existing = [...document.scripts].find(script => script.src === src);
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function getCoverageBytes(planName) {
    const key = normalizePlanName(planName);
    const fileName = COVERAGE_FILES[key];
    if (!fileName) throw new Error(`No existe un alcance oficial configurado para ${planName}.`);

    const response = await fetch(`assets/coverage/${encodeURIComponent(fileName)}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`No se pudo cargar el alcance oficial de ${planName}.`);

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!looksLikePdf(bytes) || bytes.length < 100000) throw new Error(`El alcance oficial de ${planName} está vacío o dañado.`);
    return bytes;
  }

  async function getOriginalIntroPdfBytes() {
    const response = await fetch(INTRO_PDF_FILE, { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo cargar el PDF original de Swiss Medical.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!looksLikePdf(bytes) || bytes.length < 100000) throw new Error('El PDF original de Swiss Medical está vacío o dañado.');
    return bytes;
  }

  async function buildDynamicQuotePdfBytes() {
    const JsPDF = window.jspdf?.jsPDF;
    const capture = window.html2canvas;
    if (!JsPDF || !capture) throw new Error('No se pudo cargar el generador visual del PDF.');

    await normalizePreview();
    const dynamicPages = [...pagesRoot.querySelectorAll('.quote-page:not(.ref-intro-original)')];
    if (!dynamicPages.length) throw new Error('Primero abrí la vista previa de la cotización.');

    if (document.fonts?.ready) await document.fonts.ready;
    await waitForImages(pagesRoot);

    const pdf = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    const scale = Math.max(2, Math.min(3, window.devicePixelRatio || 2));

    for (let index = 0; index < dynamicPages.length; index++) {
      const page = dynamicPages[index];
      if (index > 0) pdf.addPage('a4', 'portrait');

      const canvas = await capture(page, {
        scale,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 15000,
        removeContainer: true
      });
      const image = canvas.toDataURL('image/jpeg', 0.97);
      pdf.addImage(image, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }

    return new Uint8Array(pdf.output('arraybuffer'));
  }

  async function mergeFinalPdf(introBytes, quoteBytes, coverageBytes) {
    await loadScript(PDF_LIB_URL);
    const { PDFDocument } = window.PDFLib || {};
    if (!PDFDocument) throw new Error('No se pudo cargar el módulo de armado final del PDF.');

    const introDoc = await PDFDocument.load(introBytes);
    if (introDoc.getPageCount() < 2) throw new Error('El PDF original no contiene las dos hojas iniciales esperadas.');
    const quoteDoc = await PDFDocument.load(quoteBytes);
    const coverageDoc = await PDFDocument.load(coverageBytes);
    const outputDoc = await PDFDocument.create();

    // Copia directa de las dos primeras páginas del PDF fuente. No pasan por
    // canvas, no se convierten a imagen y no se vuelven a comprimir.
    const introPages = await outputDoc.copyPages(introDoc, [0, 1]);
    introPages.forEach(page => outputDoc.addPage(page));

    const quotePages = await outputDoc.copyPages(quoteDoc, quoteDoc.getPageIndices());
    quotePages.forEach(page => outputDoc.addPage(page));

    const coveragePages = await outputDoc.copyPages(coverageDoc, coverageDoc.getPageIndices());
    coveragePages.forEach(page => outputDoc.addPage(page));

    return outputDoc.save();
  }

  function saveBytes(bytes, fileName) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (openQuoteButton) {
    openQuoteButton.addEventListener('click', () => {
      window.setTimeout(() => {
        normalizePreview().catch(error => console.error('No se pudieron cargar las hojas originales:', error));
      }, 0);
    });
  }

  async function downloadFinalPdf() {
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Generando PDF...';

    try {
      await normalizePreview();

      const planName = document.querySelector('#selectedName')?.textContent?.trim();
      if (!planName) throw new Error('No se pudo identificar el plan seleccionado.');

      const [introBytes, quoteBytes, coverageBytes] = await Promise.all([
        getOriginalIntroPdfBytes(),
        buildDynamicQuotePdfBytes(),
        getCoverageBytes(planName)
      ]);
      const finalBytes = await mergeFinalPdf(introBytes, quoteBytes, coverageBytes);
      const clientName = document.querySelector('#clientName')?.value;
      saveBytes(finalBytes, `Cotizacion Swiss Medical (${safeFileName(clientName)}).pdf`);
    } catch (error) {
      console.error('No se pudo generar el PDF final:', error);
      alert(error?.message || 'No se pudo generar el PDF. Recargá la página e intentá nuevamente.');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    downloadFinalPdf();
  }, { capture: true });
})();
