import {create} from 'zustand';
import {persist} from 'zustand/middleware';

const themeStore = create(
    persist(
        (set) =>({
            theme:'light',
            setTheme:(theme) => set({theme})
        }),
        {
            name: "theme-storage",
           getStorage:() =>localStorage
        }
    )
)
export default themeStore;