export const openFileDialog = (inputRef) => {
  if (!inputRef.current) {
    return;
  }
  inputRef.current.click();
};

export const getAcceptTypeString = (acceptType, allowNonImageType) => {
  if (acceptType?.length)
    return acceptType.map((item) => `.${item}`).join(', ');
  if (allowNonImageType) return '';
  return 'image/*';
};

export const getBase64 = async (file) => {
  const reader = new FileReader();
  return await new Promise((resolve) => {
    reader.addEventListener('load', () => {
      resolve(String(reader.result));
    });
    reader.readAsDataURL(file);
  });
};

export const getImage = async (file) => {
  const image = new Image();
  return await new Promise((resolve) => {
    image.addEventListener('load', () => {
      resolve(image);
    });
    image.src = URL.createObjectURL(file);
  });
};

export const getListFiles = async (files, dataURLKey) => {
  const promiseFiles = [];
  for (let i = 0; i < files.length; i += 1) {
    promiseFiles.push(getBase64(files[i]));
  }
  return await Promise.all(promiseFiles).then((fileListBase64) => {
    const fileList = fileListBase64.map((base64, index) => ({
      [dataURLKey]: base64,
      file: files[index],
    }));
    return fileList;
  });
};
