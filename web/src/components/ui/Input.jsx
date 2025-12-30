import PropTypes from "prop-types";
import "./ui.css";

export function Input({ className = "", ...props }) {
  const classes = ["ui-input", className].filter(Boolean).join(" ");
  return <input className={classes} {...props} />;
}

Input.propTypes = {
  className: PropTypes.string,
};

export default Input;
