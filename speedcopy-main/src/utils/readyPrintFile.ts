export function saveReadyPrintFile(file: File, dataUrl: string) {
  localStorage.setItem('readyPrintFile', JSON.stringify({
    name: file.name,
    type: file.type,
    size: file.size,
    data: dataUrl
  }));
}
