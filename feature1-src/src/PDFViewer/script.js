const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.25;
const WHEEL_STEP = 1.1;

// Traced from the browser's own PDF toolbar: a 12x2 bar and a 13x13 cross,
// both 2px strokes with round caps, on a 20x20 grid.
const SVG_NS = 'http://www.w3.org/2000/svg';
const ICON_MINUS = 'M4 10h12';
const ICON_PLUS = 'M10 3.5v13M3.5 10h13';

var currentBlobUrl = null;
var imageViewer = null;

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

function LoadDocument(Base64Content,ContentType,IsFactbox){
    var iframe = window.frameElement;
    var height = IsFactbox ? 600 : 1100;

    requestAnimationFrame(() => {
        const blob = b64toBlob(Base64Content, ContentType);
        const blobUrl = URL.createObjectURL(blob);

        // Replace whatever document was shown before. Dropping the old markup
        // also drops its event listeners, so nothing accumulates as the user
        // clicks through the attachment list.
        const container = document.querySelector("#my-pdf");
        imageViewer = null;
        container.innerHTML = '';

        // Give the container a concrete height so the viewer's height: 100%
        // chain has something to resolve against.
        container.style.height = height + 'px';
        container.appendChild(createViewer(ContentType, blobUrl));

        // The previous document is detached now, so its blob can be released.
        if (currentBlobUrl) {
            URL.revokeObjectURL(currentBlobUrl);
        }
        currentBlobUrl = blobUrl;

        iframe.style.maxHeight = height + 'px';
        iframe.style.height =  height + 'px';
    });
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

function createImageViewer(blobUrl) {
    const root = document.createElement('div');
    root.className = 'pdfv2-image-viewer';

    const stage = document.createElement('div');
    stage.className = 'pdfv2-stage';

    const image = document.createElement('img');
    image.className = 'pdfv2-image';
    image.src = blobUrl;

    const label = document.createElement('span');
    label.className = 'pdfv2-zoom-label';

    imageViewer = { image: image, stage: stage, label: label, scale: 1 };

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
    stage.addEventListener('wheel', onStageWheel);
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

function createToolbarDivider() {
    const divider = document.createElement('span');
    divider.className = 'pdfv2-toolbar-divider';
    return divider;
}

// Sizing the image in pixels rather than transforming it keeps the stage's
// own scrollbars in sync with the zoom level, which is what makes panning work.
function setZoom(scale) {
    if (!imageViewer || !imageViewer.image.naturalWidth) {
        return;
    }

    scale = Math.min(Math.max(scale, MIN_ZOOM), MAX_ZOOM);
    imageViewer.scale = scale;
    imageViewer.image.style.width = (imageViewer.image.naturalWidth * scale) + 'px';
    imageViewer.label.textContent = Math.round(scale * 100) + '%';
}

function zoomBy(factor) {
    if (imageViewer) {
        setZoom(imageViewer.scale * factor);
    }
}

function zoomToFit() {
    if (!imageViewer || !imageViewer.image.naturalWidth) {
        return;
    }

    const image = imageViewer.image;
    const viewport = stageViewport();

    // Never scale a small picture up just to fill the panel.
    setZoom(Math.min(viewport.width / image.naturalWidth,
                     viewport.height / image.naturalHeight,
                     1));
}

// clientWidth/clientHeight include the stage's padding, which is not space the
// image can actually occupy.
function stageViewport() {
    const stage = imageViewer.stage;
    const styles = getComputedStyle(stage);

    return {
        width: stage.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight),
        height: stage.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom)
    };
}

function onStageWheel(e) {
    if (!imageViewer) {
        return;
    }

    e.preventDefault();
    zoomBy(e.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP);
}

// Drag to pan. The listeners sit on the stage rather than the window so they
// are discarded along with it when the next attachment is loaded.
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
