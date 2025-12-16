import PropTypes from "prop-types";
import "./ui.css";

const variantClassMap = {
  purple: "ui-pill-purple",
  white: "ui-pill-white",
  muted: "ui-pill-muted",
};

export function Pill({ children, variant = "purple", className = "", ...props }) {
  const variantClass = variantClassMap[variant] || variantClassMap.purple;
  const classes = ["ui-pill", variantClass, className].filter(Boolean).join(" ");

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}

Pill.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(["purple", "white", "muted"]),
  className: PropTypes.string,
};

export default Pill;
