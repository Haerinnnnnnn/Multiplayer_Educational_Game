import React from 'react';

function joinClassNames(...inputs) {
  return inputs.filter(Boolean).join(' ');
}

const sizeClassByName = {
  default: 'glass-button-size-default',
  sm: 'glass-button-size-sm',
  lg: 'glass-button-size-lg',
  icon: 'glass-button-size-icon',
};

export const GlassButton = React.forwardRef(function GlassButton(
  { children, className = '', contentClassName = '', size = 'default', ...props },
  ref,
) {
  const sizeClassName = sizeClassByName[size] || sizeClassByName.default;

  return (
    <span className={joinClassNames('glass-button-wrap', className)}>
      <button className={joinClassNames('glass-button', sizeClassName)} ref={ref} {...props}>
        <span className={joinClassNames('glass-button-text', contentClassName)}>{children}</span>
      </button>
      <span className="glass-button-shadow" />
    </span>
  );
});
