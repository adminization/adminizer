import {useCallback, memo} from 'react';

import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface EditorProps {
    initialValue: string,
    onChange: (value: string) => void
}


function ReactQuillEditor({initialValue, onChange}: EditorProps) {

    const handleEditorChange = useCallback((value:string) => {
        onChange(value);
    }, [onChange]);


    return <ReactQuill theme="snow" value={initialValue} onChange={handleEditorChange} style={{paddingBottom: '40px'}}/>;
}
export default memo(ReactQuillEditor);
