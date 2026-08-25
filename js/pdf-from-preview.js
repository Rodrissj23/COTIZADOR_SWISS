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

    // La propuesta comercial no duplica el alcance técnico reconstruido:
    // si existe el PDF oficial del plan, se adjunta directamente al descargar.
    pagesRoot.querySelectorAll('.ref-technical').forEach(page => page.remove());

    const pageCount = pagesRoot.querySelectorAll('.quote-page').length;
    const toolbarText = document.querySelector('.dialog-toolbar small');
    if (toolbarText && pageCount) {
      toolbarText.textContent = `${pageCount} página${pageCount === 1 ? '' : 's'} de propuesta · alcance oficial se adjunta al descargar cuando está disponible`;
    }
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

  async function getCoverageBytes(planName) {
    const key = normalizePlanName(planName);
    const fileName = COVERAGE_FILES[key];
    if (!fileName) return null;

    const response = await fetch(`assets/coverage/${encodeURIComponent(fileName)}`, { cache: 'no-store' });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`No se pudo cargar el alcance oficial de ${planName}.`);
    return base64ToBytes(await response.text());
  }

  async function buildProposalPdfBytes() {
    const JsPDF = window.jspdf?.jsPDF;
    const capture = window.html2canvas;
    const pages = [...pagesRoot.querySelectorAll('.quote-page')];
    if (!JsPDF || !capture) throw new Error('No se pudo cargar el generador visual del PDF.');
    if (!pages.length) throw new Error('Primero abrí la vista previa de la cotización.');

    if (document.fonts?.ready) await document.fonts.ready;
    await waitForImages(pagesRoot);

    const pdf = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    const scale = Math.max(2, Math.min(3, window.devicePixelRatio || 2));

    for (let index = 0; index < pages.length; index++) {
      const canvas = await capture(pages[index], {
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
      pdf.addImage(image, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }

    return new Uint8Array(pdf.output('arraybuffer'));
  }

  async function mergeWithOfficialCoverage(proposalBytes, coverageBytes) {
    if (!coverageBytes) return proposalBytes;

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
