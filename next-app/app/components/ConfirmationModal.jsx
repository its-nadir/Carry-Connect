import styles from './ConfirmationModal.module.css';

export default function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, isAlert, confirmText }) {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.message}>{message}</p>
                <div className={styles.actions}>
                    {!isAlert && (
                        <button className={styles.cancelBtn} onClick={onClose}>
                            Cancel
                        </button>
                    )}
                    <button className={styles.confirmBtn} onClick={isAlert ? onClose : onConfirm}>
                        {confirmText || (isAlert ? "Close" : "Confirm")}
                    </button>
                </div>
            </div>
        </div>
    );
}
