import {create} from 'zustand';
import {persist} from 'zustand/middleware';

const loginStore = create(
    persist(
        (set) =>({
            step:1,
            userPhoneData:null,
            setStep: (step) => set({step}),
            setUserPhoneData: (data) => set({userPhoneData}),
            resetLoginState: () => set({step:1, userPhoneData:null})
        }),
        {
            name: "login-storage",
            partialize:(state) =>({
                step:state.step,
                userPhoneData: state.userPhoneData
            })
        }
    )
)
export default loginStore;