import PropTypes from "prop-types";
import "./ui.css";

const variantClassMap = {
  primary: "ui-button-primary",
  secondary: "ui-button-secondary",
  ghost: "ui-button-ghost",
  danger: "ui-button-danger",
  toggle: "ui-button-toggle",
};

export function Button({
  children,
  variant = "primary",
  fullWidth = false,
  active = false,
  className = "",
  ...props
}) {
  const variantClass = variantClassMap[variant] || variantClassMap.primary;
  const classes = [
    "ui-button",
    variantClass,
    fullWidth ? "ui-button-full" : "",
    active ? "ui-button-active" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(["primary", "secondary", "ghost", "danger", "toggle"]),
  fullWidth: PropTypes.bool,
  active: PropTypes.bool,
  className: PropTypes.string,
};

export default Button;
