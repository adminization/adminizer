import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {useState} from "react";
import axios from "@/lib/axios-compat";
import {Button} from "@/components/ui/button";

interface ActionProps {
    items: any,
    callback: () => void
}

const Action = ({items, callback}: ActionProps) => {
    const [number, setNumber] = useState<string>('')
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [message, setMessage] = useState<string>('')

    const sendData = async () => {
        setIsLoading(true)
        setMessage('Отправка данных...')
        try {
            const data = {
                actionID: 'external_action',
                items: items,
                data: {number: number}
            }
            const res = await axios.put<any>('', {data: data, _method: 'handleAction'})
            if (res.data.data === 'ok') {
                setMessage('Данные успешно отправлены.')
                setTimeout(() => {
                    callback()
                }, 500)
            } else {
                setMessage('Неверный ответ.')
            }
        } catch (e) {
            console.log(e)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="mt-4 px-8">
            <div className="flex flex-col gap-3">
                <Label htmlFor="name">5 + 2 = ?</Label>
                <Input
                    required
                    value={number}
                    type="number"
                    name="number"
                    placeholder="number"
                    onChange={(e) => setNumber(e.target.value)}
                    disabled={isLoading}
                />
                <Button variant="default" className="w-fit" onClick={sendData} disabled={isLoading}>Отправить</Button>
                {message && <div>{message}</div>}
            </div>
        </div>
    )
}
export default Action
