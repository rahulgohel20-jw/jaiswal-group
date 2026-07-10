import React, { useCallback, useRef, useState } from 'react';
import { getAcceptTypeString, getListFiles, openFileDialog } from './utils';

export const DEFAULT_NULL_INDEX = -1;
export const DEFAULT_DATA_URL_KEY = 'dataURL';

const ImageInput = ({
  value,
  acceptType,
  inputProps,
  multiple,
  children,
  onChange,
}) => {
  const inValue = value || [];
  const inputRef = useRef(null);
  const [keyUpdate, setKeyUpdate] = useState(DEFAULT_NULL_INDEX);
  const [isDragging, setIsDragging] = useState(false);

  const onImageRemoveAll = useCallback(() => {
    onChange?.([]);
  }, [onChange]);

  const handleClickInput = useCallback(() => {
    openFileDialog(inputRef);
  }, [inputRef]);

  const onImageUpload = useCallback(() => {
    handleClickInput();
  }, [handleClickInput]);

  const onInputChange = async (e) => {
    await handleChange(e.target.files);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleChange = async (files) => {
    if (!files) return;
    const fileList = await getListFiles(files, DEFAULT_DATA_URL_KEY);
    if (!fileList.length) return;
    let updatedFileList;
    const updatedIndexes = [];
    if (keyUpdate > DEFAULT_NULL_INDEX) {
      const [firstFile] = fileList;
      updatedFileList = [...inValue];
      updatedFileList[keyUpdate] = firstFile;
      updatedIndexes.push(keyUpdate);
    } else if (multiple) {
      updatedFileList = [...inValue, ...fileList];
      for (let i = inValue.length; i < updatedFileList.length; i += 1) {
        updatedIndexes.push(i);
      }
    } else {
      updatedFileList = [fileList[0]];
      updatedIndexes.push(0);
    }
    onChange?.(updatedFileList, updatedIndexes);
  };

  const onImageRemove = (index) => {
    const updatedList = [...inValue];
    if (Array.isArray(index)) {
      index.forEach((i) => {
        updatedList.splice(i, 1);
      });
    } else {
      updatedList.splice(index, 1);
    }
    onChange?.(updatedList);
  };

  const onImageUpdate = (index) => {
    setKeyUpdate(index);
    handleClickInput();
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOut = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleChange(e.dataTransfer.files);
    }
  };

  const handleDragStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.clearData();
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={getAcceptTypeString(acceptType)}
        multiple={multiple}
        onChange={(e) => {
          onInputChange(e);
        }}
        style={{ display: 'none' }}
        {...inputProps}
      />

      {children?.({
        fileList: inValue,
        onImageUpload,
        onImageRemove,
        onImageUpdate,
        onImageRemoveAll,
        dragProps: {
          onDrop: handleDrop,
          onDragEnter: handleDragIn,
          onDragLeave: handleDragOut,
          onDragOver: handleDrag,
          onDragStart: handleDragStart,
        },
        isDragging,
      })}
    </>
  );
};

export { ImageInput };
