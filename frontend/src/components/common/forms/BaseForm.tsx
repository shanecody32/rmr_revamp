import {FormInstance} from "antd/es/form";

export interface BaseFormRef {
    form: FormInstance;
    submit: () => void;
}