import { useEffect, useRef} from "react"

export default function PublishGroupDialog({ children, onClose}) {
    const dialogRef = useRef(null);

    useEffect(() => {
        const dialogRef = dialogRef.current;

        if(!dialog.open){
            dialog.showModel();
        }
    }, []);

    return (
        <dialog
            ref={dialogRef}
            className="publish-group-dialog"
            aria-label="Publish groups"
            onClose={onClose}
        >
            {children}
        </dialog>
    );
}
 