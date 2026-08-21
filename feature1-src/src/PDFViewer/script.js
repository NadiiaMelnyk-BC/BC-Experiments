var currentBlobUrl = null;

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

function LoadPDF(PDFDocument,IsFactbox){
    var iframe = window.frameElement;
    var height = IsFactbox ? 600 : 1100;

    requestAnimationFrame(() => {
        const blob = b64toBlob(PDFDocument, "application/pdf");
        const blobUrl = URL.createObjectURL(blob);

        // Hand the blob to the browser's own PDF viewer, replacing whatever
        // document was shown before.
        const container = document.querySelector("#my-pdf");
        container.innerHTML = '';

        const viewer = document.createElement('embed');
        viewer.className = 'pdfv2-frame';
        viewer.type = 'application/pdf';
        viewer.src = blobUrl;
        container.appendChild(viewer);

        // The previous document is detached now, so its blob can be released.
        if (currentBlobUrl) {
            URL.revokeObjectURL(currentBlobUrl);
        }
        currentBlobUrl = blobUrl;

        iframe.style.maxHeight = height + 'px';
        iframe.style.height =  height + 'px';
    });
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
