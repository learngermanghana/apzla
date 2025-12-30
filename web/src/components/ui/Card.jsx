import PropTypes from "prop-types";
import "./ui.css";

const variantClassMap = {
  default: "",
  frosted: "ui-card-frosted",
  compact: "ui-card-compact",
  dark: "ui-card-dark",
  gradient: "ui-card-gradient",
};

export function Card({ children, variant = "default", className = "", ...props }) {
  const variantClass = variantClassMap[variant] || "";
  const classes = ["ui-card", variantClass, className].filter(Boolean).join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

Card.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(["default", "frosted", "compact", "dark", "gradient"]),
  className: PropTypes.string,
};

export default Card;
