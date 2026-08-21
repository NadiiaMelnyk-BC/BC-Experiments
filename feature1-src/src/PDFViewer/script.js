const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.25;
const WHEEL_STEP = 1.1;

// How far ahead of the viewport a panel starts loading.
const PRELOAD_MARGIN = '300px';

// Traced from the browser's own PDF toolbar: a 12x2 bar and a 13x13 cross,
// both 2px strokes with round caps, on a 20x20 grid.
const SVG_NS = 'http://www.w3.org/2000/svg';
const ICON_MINUS = 'M4 10h12';
const ICON_PLUS = 'M10 3.5v13M3.5 10h13';

var galleryBlobUrls = {};
var panelObserver = null;

function InitializeControl(controlId) {
    var controlAddIn = document.getElementById(controlId);
    controlAddIn.innerHTML ='<div id="my-pdf" class="pdfv2-container"></div>';
}

function SetVisible(IsVisible) {
    if (IsVisible){
        document.querySelector("#my-pdf").style.display = 'block';
    }else{
        document.querySelector("#my-pdf").style.display = 'none';
    }

}

function LoadGallery(ItemsJson,LoadingText,IsFactbox){
    var iframe = window.frameElement;
    var height = IsFactbox ? 600 : 1100;

    requestAnimationFrame(() => {
        const container = document.querySelector("#my-pdf");

        // Rebuilding replaces every panel, so the old ones release their blobs
        // and the observer stops watching markup that is about to be discarded.
        releaseAllBlobs();
        if (panelObserver) {
            panelObserver.disconnect();
            panelObserver = null;
        }
        container.innerHTML = '';

        // Give the container a concrete height so the gallery's height: 100%
        // chain has something to resolve against.
        container.style.height = height + 'px';

        const gallery = document.createElement('div');
        gallery.className = 'pdfv2-gallery';
        JSON.parse(ItemsJson).forEach((item) => {
            gallery.appendChild(createPanel(item, LoadingText));
        });
        container.appendChild(gallery);

        observePanels(gallery);

        iframe.style.maxHeight = height + 'px';
        iframe.style.height =  height + 'px';
    });
}

function createPanel(item, loadingText) {
    const panel = document.createElement('section');
    panel.className = 'pdfv2-panel';
    panel.dataset.id = item.id;

    const header = document.createElement('div');
    header.className = 'pdfv2-panel-header';
    header.textContent = item.name;
    header.title = item.name;

    const body = document.createElement('div');
    body.className = 'pdfv2-panel-body';

    // A panel with nothing to render never asks AL for content, and gives up
    // the space a preview would have taken.
    if (item.contentType) {
        body.appendChild(createNote(loadingText));
    } else {
        body.appendChild(createNote(item.note));
        panel.classList.add('pdfv2-panel-collapsed');
        panel.dataset.state = 'done';
    }

    panel.appendChild(header);
    panel.appendChild(body);
    return panel;
}

// Content is fetched per panel as it approaches the viewport, so a record with
// many attachments does not push every file through the bridge at once.
function observePanels(gallery) {
    panelObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const panel = entry.target;
            if (!entry.isIntersecting || panel.dataset.state) {
                return;
            }

            panel.dataset.state = 'requested';
            Microsoft.Dynamics.NAV.InvokeExtensibilityMethod(
                'DocumentRequested', [panel.dataset.id]);
        });
    }, { root: gallery, rootMargin: PRELOAD_MARGIN });

    gallery.querySelectorAll('.pdfv2-panel').forEach((panel) => {
        panelObserver.observe(panel);
    });
}

function LoadGalleryDocument(AttachmentId,Base64Content,ContentType){
    const body = panelBody(AttachmentId);
    if (!body) {
        return;
    }

    const blob = b64toBlob(Base64Content, ContentType);
    const blobUrl = URL.createObjectURL(blob);
    releaseBlob(AttachmentId);
    galleryBlobUrls[AttachmentId] = blobUrl;

    body.innerHTML = '';
    body.appendChild(createViewer(ContentType, blobUrl));
    markDone(AttachmentId);
}

function LoadGalleryNote(AttachmentId,NoteText){
    const panel = findPanel(AttachmentId);
    if (!panel) {
        return;
    }

    const body = panel.querySelector('.pdfv2-panel-body');
    body.innerHTML = '';
    body.appendChild(createNote(NoteText));

    // Content that never arrived should not keep holding a preview's worth of
    // space open.
    panel.classList.add('pdfv2-panel-collapsed');
    panel.dataset.state = 'done';
}

// Ids are GUIDs in braces, which would need escaping inside a selector, so the
// panels are matched by comparing the attribute instead.
function findPanel(attachmentId) {
    const panels = document.querySelectorAll('.pdfv2-panel');
    for (let i = 0; i < panels.length; i++) {
        if (panels[i].dataset.id === attachmentId) {
            return panels[i];
        }
    }
    return null;
}

function panelBody(attachmentId) {
    const panel = findPanel(attachmentId);
    return panel ? panel.querySelector('.pdfv2-panel-body') : null;
}

function markDone(attachmentId) {
    const panel = findPanel(attachmentId);
    if (panel) {
        panel.dataset.state = 'done';
    }
}

function createNote(text) {
    const note = document.createElement('p');
    note.className = 'pdfv2-note';
    note.textContent = text;
    return note;
}

function releaseBlob(attachmentId) {
    if (galleryBlobUrls[attachmentId]) {
        URL.revokeObjectURL(galleryBlobUrls[attachmentId]);
        delete galleryBlobUrls[attachmentId];
    }
}

function releaseAllBlobs() {
    Object.keys(galleryBlobUrls).forEach(releaseBlob);
}

// Images get our own zoom/pan viewer. Everything else goes to the browser's
// built-in plugin viewer, which is what handles PDF and brings its own
// toolbar.
function createViewer(ContentType, blobUrl) {
    if (ContentType.indexOf('image/') === 0) {
        return createImageViewer(blobUrl);
    }

    const viewer = document.createElement('embed');
    viewer.className = 'pdfv2-frame';
    viewer.type = ContentType;
    viewer.src = blobUrl;
    return viewer;
}

// Each panel owns its zoom state, so several images can be open at once.
function createImageViewer(blobUrl) {
    const root = document.createElement('div');
    root.className = 'pdfv2-viewer';

    const stage = document.createElement('div');
    stage.className = 'pdfv2-stage';

    const image = document.createElement('img');
    image.className = 'pdfv2-image';
    image.src = blobUrl;

    const label = document.createElement('span');
    label.className = 'pdfv2-zoom-label';

    let scale = 1;

    // Sizing the image in pixels rather than transforming it keeps the stage's
    // own scrollbars in sync with the zoom level, which is what makes panning
    // work.
    function setZoom(nextScale) {
        if (!image.naturalWidth) {
            return;
        }

        scale = Math.min(Math.max(nextScale, MIN_ZOOM), MAX_ZOOM);
        image.style.width = (image.naturalWidth * scale) + 'px';
        label.textContent = Math.round(scale * 100) + '%';
    }

    function zoomBy(factor) {
        setZoom(scale * factor);
    }

    function zoomToFit() {
        if (!image.naturalWidth) {
            return;
        }

        // clientWidth/clientHeight include the stage's padding, which is not
        // space the image can actually occupy.
        const styles = getComputedStyle(stage);
        const width = stage.clientWidth
            - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
        const height = stage.clientHeight
            - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);

        // Never scale a small picture up just to fill the panel.
        setZoom(Math.min(width / image.naturalWidth, height / image.naturalHeight, 1));
    }

    // Zoom level on the left, controls on the right, with the same grouping
    // divider the browser's own PDF toolbar uses.
    const toolbar = document.createElement('div');
    toolbar.className = 'pdfv2-toolbar';
    toolbar.appendChild(label);
    toolbar.appendChild(createZoomButton(createIcon(ICON_MINUS), 'Zoom out', () => zoomBy(1 / ZOOM_STEP)));
    toolbar.appendChild(createZoomButton(createIcon(ICON_PLUS), 'Zoom in', () => zoomBy(ZOOM_STEP)));
    toolbar.appendChild(createToolbarDivider());
    toolbar.appendChild(createZoomButton('Fit', 'Fit to window', zoomToFit));
    toolbar.appendChild(createZoomButton('1:1', 'Actual size', () => setZoom(1)));

    stage.appendChild(image);
    root.appendChild(toolbar);
    root.appendChild(stage);

    // naturalWidth is only known once the blob has decoded.
    image.addEventListener('load', zoomToFit);
    stage.addEventListener('wheel', (e) => {
        e.preventDefault();
        zoomBy(e.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP);
    });
    enablePanning(stage);

    return root;
}

function createZoomButton(content, title, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pdfv2-zoom-button';
    button.title = title;

    if (typeof content === 'string') {
        button.textContent = content;
    } else {
        button.appendChild(content);
    }

    button.addEventListener('click', onClick);
    return button;
}

function createToolbarDivider() {
    const divider = document.createElement('span');
    divider.className = 'pdfv2-toolbar-divider';
    return divider;
}

function createIcon(pathData) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 20 20');
    svg.setAttribute('class', 'pdfv2-icon');
    svg.setAttribute('aria-hidden', 'true');

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');

    svg.appendChild(path);
    return svg;
}

// Drag to pan. The listeners sit on the stage rather than the window so they
// are discarded along with it when the gallery is rebuilt.
function enablePanning(stage) {
    let panning = false;
    let startX = 0, startY = 0, startLeft = 0, startTop = 0;

    const stop = () => {
        panning = false;
        stage.classList.remove('pdfv2-panning');
    };

    stage.addEventListener('mousedown', (e) => {
        panning = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = stage.scrollLeft;
        startTop = stage.scrollTop;
        stage.classList.add('pdfv2-panning');
        e.preventDefault();
    });

    stage.addEventListener('mousemove', (e) => {
        if (!panning) {
            return;
        }
        stage.scrollLeft = startLeft - (e.clientX - startX);
        stage.scrollTop = startTop - (e.clientY - startY);
    });

    stage.addEventListener('mouseup', stop);
    stage.addEventListener('mouseleave', stop);
}

const b64toBlob = (b64Data, contentType='', sliceSize=512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);

      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, {type: contentType});
    return blob;
}
