import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import styles from './Select.module.scss';

export type SelectOption = {
  value: string;
  label: string;
  icon?: ReactNode;
};

type SelectProps = {
  id: string;
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function Select({
  id,
  label,
  options,
  value,
  onChange,
  disabled = false,
}: SelectProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const wasOpen = useRef(false);
  const listId = useId();
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      optionRefs.current[activeIndex]?.focus();
    }
  }, [activeIndex, open]);

  useEffect(() => {
    if (wasOpen.current && !open) {
      triggerRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  function openList(): void {
    if (disabled || options.length === 0) {
      return;
    }
    setActiveIndex(selectedIndex);
    setOpen(true);
  }

  function closeList(): void {
    setOpen(false);
  }

  function choose(index: number): void {
    const option = options[index];
    if (!option) {
      return;
    }
    onChange(option.value);
    closeList();
  }

  function moveActive(index: number): void {
    const last = options.length - 1;
    setActiveIndex(Math.max(0, Math.min(last, index)));
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    if (disabled) {
      return;
    }
    if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp' ||
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault();
      openList();
    }
  }

  function onListKeyDown(event: KeyboardEvent<HTMLUListElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeList();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(activeIndex + 1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(activeIndex - 1);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      moveActive(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      moveActive(options.length - 1);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(activeIndex);
    }
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={styles.trigger}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={selected ? `${label}: ${selected.label}` : label}
        onClick={() => {
          if (open) {
            closeList();
          } else {
            openList();
          }
        }}
        onKeyDown={onTriggerKeyDown}
      >
        {selected?.icon ? (
          <span className={styles.icon}>{selected.icon}</span>
        ) : null}
        <span className={styles.value}>{selected?.label}</span>
        <Chevron />
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={id}
          className={styles.list}
          tabIndex={-1}
          onKeyDown={onListKeyDown}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              ref={(node) => {
                optionRefs.current[index] = node;
              }}
              role="option"
              aria-selected={option.value === value}
              tabIndex={index === activeIndex ? 0 : -1}
              className={styles.option}
              onClick={() => {
                choose(index);
              }}
            >
              {option.icon ? (
                <span className={styles.icon} aria-hidden="true">
                  {option.icon}
                </span>
              ) : null}
              <span>{option.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Chevron(): React.JSX.Element {
  return (
    <svg
      className={styles.chevron}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M4 6l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
