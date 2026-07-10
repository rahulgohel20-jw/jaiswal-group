import { useCallback, useState } from 'react';

export function useSliderInput({ minValue, maxValue, initialValue }) {
  const [sliderValues, setSliderValues] = useState(initialValue);
  const [inputValues, setInputValues] = useState(initialValue);

  // Handle slider changes and sync with input values
  const handleSliderChange = useCallback((values) => {
    setSliderValues(values);
    setInputValues(values);
  }, []);

  // Handle input changes for min or max
  const handleInputChange = useCallback(
    (e, index) => {
      const newValue = parseFloat(e.target.value);
      if (!isNaN(newValue)) {
        const updatedInputs = [...inputValues];
        updatedInputs[index] = newValue;
        setInputValues(updatedInputs);
      }
    },
    [inputValues],
  );

  // Validate and update slider values when input loses focus or user presses Enter
  const validateAndUpdateValue = useCallback(
    (value, index) => {
      const updatedSlider = [...sliderValues];

      if (index === 0) {
        // Min value
        updatedSlider[0] = Math.max(minValue, Math.min(value, sliderValues[1]));
      } else {
        // Max value
        updatedSlider[1] = Math.min(maxValue, Math.max(value, sliderValues[0]));
      }

      setSliderValues(updatedSlider);
      setInputValues(updatedSlider);
    },
    [sliderValues, minValue, maxValue],
  );

  return {
    setSliderValues,
    setInputValues,
    sliderValues,
    inputValues,
    handleSliderChange,
    handleInputChange,
    validateAndUpdateValue,
  };
}
