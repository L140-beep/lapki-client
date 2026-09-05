export const InputRender: React.FC<{ props }> = ({ props }) => {
  return (
    <form {...props.formProps}>
      <span>
        <input
          {...props.inputProps}
          ref={props.inputRef}
          maxLength={16}
          className="h-8 rounded-lg"
        />
      </span>
      <span>
        <button {...props.submitButtonProps} ref={props.submitButtonRef} type="submit" />
      </span>
    </form>
  );
};
