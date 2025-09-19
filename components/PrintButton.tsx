import React, { useCallback, useEffect } from 'react';

interface PrintButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  areaId?: string;
  label?: string;
  title?: string;
}

// Utility: detect :has() support for potential future enhancements
const supportsHasSelector = (() => {
  try {
    // @ts-ignore
    return CSS && CSS.supports && CSS.supports('selector(body:has(.x))');
  } catch {
    return false;
  }
})();

const PrintButton: React.FC<PrintButtonProps> = ({ areaId, label = 'Cetak', title, ...btnProps }) => {
  useEffect(() => {
    const before = () => document.body.classList.add('printing');
    const after = () => document.body.classList.remove('printing');
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
      document.body.classList.remove('printing');
    };
  }, []);

  const doSystemPrint = useCallback(() => {
    try {
      document.body.classList.add('printing');
      window.print();
    } finally {
      setTimeout(() => document.body.classList.remove('printing'), 1000);
    }
  }, []);

  const handleClick = useCallback(() => {
    const anyWin = window as any;

    // If a specific area is requested, try to ensure it is marked printable (temporary)
    let targetEl: HTMLElement | null = null;
    let addedTempClass = false;
    if (areaId) {
      targetEl = document.getElementById(areaId);
      if (!targetEl) {
        // Fallback to full page print if target not found
        if (anyWin.__venaPrintFull) {
          anyWin.__venaPrintFull(title);
        } else {
          doSystemPrint();
        }
        return;
      }
      if (!targetEl.classList.contains('printable-area') && !targetEl.classList.contains('printable-area-temp')) {
        targetEl.classList.add('printable-area-temp');
        addedTempClass = true;
      }
    }

    // If areaId provided and target exists, use JS fallback method per template
    if (targetEl) {
      // Toggle body printing to emulate :has() behavior for older browsers
      document.body.classList.add('printing');
      // small delay to allow reflow
      setTimeout(() => {
        try {
          window.print();
        } finally {
          setTimeout(() => {
            document.body.classList.remove('printing');
            if (addedTempClass && targetEl) {
              targetEl.classList.remove('printable-area-temp');
            }
          }, 400);
        }
      }, 50);
      return;
    }

    // Full-page print: Prefer the project helper if available to avoid fixed/transform print bugs
    if (anyWin.__venaPrintFull) {
      anyWin.__venaPrintFull(title);
      return;
    }

    // Fallback: system print with JS-based body printing toggle
    if (!supportsHasSelector) {
      document.body.classList.add('printing');
    }
    window.print();
    setTimeout(() => {
      if (!supportsHasSelector) {
        document.body.classList.remove('printing');
      }
    }, 1000);
  }, [areaId, title, doSystemPrint]);

  return (
    <button type="button" onClick={handleClick} className="button-primary inline-flex items-center gap-2" {...btnProps}>
      {label}
    </button>
  );
};

export default PrintButton;
