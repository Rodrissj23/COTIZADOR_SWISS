(() => {
  const button = document.querySelector('#printQuote');
  const pagesRoot = document.querySelector('#quotePages');
  const openQuoteButton = document.querySelector('#openQuote');
  if (!button || !pagesRoot) return;

  const ORIGINAL_NETWORK_IMAGE = 'assets/images/swiss-network-original.jpg';
  const PDF_LIB_URL = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
  const COVERAGE_FILES = {
    'AMBU1': 'AMBU1 08_2026.pdf.b64',
    'AMBU2': 'AMBU2 08_2026.pdf.b64',
    'INTER1': 'INTER1 08_2026.pdf.b64',
    'S1': 'S1 08_2026.pdf.b64',
    'S2': 'S2 08_2026.pdf.b64',
    'SMG02': 'SMG02 08_2026.pdf.b64',
    'SMG20': 'SMG20 08_2026.pdf.b64',
    'SMG30': 'SMG30 08_2026.pdf.b64',
    'SMG40': 'SMG40 08_2026.pdf.b64',
    'SMG50': 'SMG50 08_2026.pdf.b64',
    'SMG60': 'SMG60 08_2026.pdf.b64',
    'SMG70': 'SMG70 08_2026.pdf.b64',
    'SPORT': 'SPORT 08_2026.pdf.b64',
    'SPORT+': 'SPORT+ 08_2026.pdf.b64',
    'SPORT S': 'SPORT-S 08_2026.pdf.b64'
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

  function normalizePreview() {
    const networkImage = pagesRoot.querySelector('.ref-network--image img');
    if (networkImage) {
      networkImage.src = ORIGINAL_NETWORK_IMAGE;
      networkImage.alt = 'Hoy contamos con · Swiss Medical';
    }

    // La propuesta comercial no incorpora resúmenes de cobertura reconstruidos.
    // El alcance médico exacto se adjunta luego como PDF oficial del plan.
    pagesRoot.querySelectorAll('.ref-technical').forEach(page => page.remove());

    const pageCount = pagesRoot.querySelectorAll('.quote-page').length;
    const toolbarText = document.querySelector('.dialog-toolbar small');
    if (toolbarText && pageCount) {
      toolbarText.textContent = `${pageCount} página${pageCount === 1 ? '' : 's'} de propuesta · alcance oficial exacto incluido en la descarga`;
    }
  }

  // quote-reference.js arma la vista base. En esta capa final eliminamos cualquier
  // hoja técnica sintética para respetar el orden: portada -> institucional ->
  // cotización -> detalle familiar -> alcance oficial exacto.
  if (typeof window.buildQuote === 'function') {
    const buildQuoteBase = window.buildQuote;
    window.buildQuote = function(...args) {
      const result = buildQuoteBase.apply(this, args);
      normalizePreview();
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

  function base64ToBytes(base64) {
    const clean = String(base64 || '').replace(/\s+/g, '');
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  function looksLikePdf(bytes) {
    return bytes?.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  }

  async function getCoverageBytes(planName) {
    const key = normalizePlanName(planName);
    const fileName = COVERAGE_FILES[key];
    if (!fileName) throw new Error(`No existe un alcance oficial configurado para ${planName}.`);

    const response = await fetch(`assets/coverage/${encodeURIComponent(fileName)}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`No se pudo cargar el alcance oficial de ${planName}.`);

    const encoded = String(await response.text()).replace(/\s+/g, '');
    if (encoded.length < 100) throw new Error(`El alcance oficial de ${planName} está vacío o dañado.`);

    try {
      const bytes = base64ToBytes(encoded);
      if (!looksLikePdf(bytes)) throw new Error('firma PDF inválida');
      return bytes;
    } catch (error) {
      console.error(`Alcance inválido para ${planName}:`, error);
      throw new Error(`El alcance oficial de ${planName} está dañado.`);
    }
  }

  function imageElementToDataUrl(img) {
    if (!img?.naturalWidth || !img?.naturalHeight) throw new Error('No se pudo cargar la página institucional original.');
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.98);
  }

  async function buildProposalPdfBytes() {
    const JsPDF = window.jspdf?.jsPDF;
    const capture = window.html2canvas;
    const pages = [...pagesRoot.querySelectorAll('.quote-page')];
    if (!JsPDF || !capture) throw new Error('No se pudo cargar el generador visual del PDF.');
    if (!pages.length) throw new Error('Primero abrí la vista previa de la cotización.');

    normalizePreview();
    const finalPages = [...pagesRoot.querySelectorAll('.quote-page')];
    if (document.fonts?.ready) await document.fonts.ready;
    await waitForImages(pagesRoot);

    const pdf = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    const scale = Math.max(2, Math.min(3, window.devicePixelRatio || 2));

    for (let index = 0; index < finalPages.length; index++) {
      const page = finalPages[index];
      if (index > 0) pdf.addPage('a4', 'portrait');

      // La institucional es una captura oficial completa: se inserta directamente
      // para evitar que html2canvas altere sus proporciones o recorte la imagen.
      if (page.classList.contains('ref-network--image')) {
        const img = page.querySelector('img');
        const image = imageElementToDataUrl(img);
        pdf.addImage(image, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        continue;
      }

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

  async function mergeWithOfficialCoverage(proposalBytes, coverageBytes) {
    await loadScript(PDF_LIB_URL);
    const { PDFDocument } = window.PDFLib || {};
    if (!PDFDocument) throw new Error('No se pudo cargar el módulo de armado final del PDF.');

    const proposalDoc = await PDFDocument.load(proposalBytes);
    const coverageDoc = await PDFDocument.load(coverageBytes);
    const outputDoc = await PDFDocument.create();

    const proposalPages = await outputDoc.copyPages(proposalDoc, proposalDoc.getPageIndices());
    proposalPages.forEach(page => outputDoc.addPage(page));

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
    openQuoteButton.addEventListener('click', () => window.setTimeout(normalizePreview, 0));
  }

  async function downloadFinalPdf() {
    normalizePreview();
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Generando PDF...';

    try {
      const planName = document.querySelector('#selectedName')?.textContent?.trim();
      if (!planName) throw new Error('No se pudo identificar el plan seleccionado.');

      const [proposalBytes, coverageBytes] = await Promise.all([
        buildProposalPdfBytes(),
        getCoverageBytes(planName)
      ]);
      const finalBytes = await mergeWithOfficialCoverage(proposalBytes, coverageBytes);
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
