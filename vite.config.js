import mkcert from 'vite-plugin-mkcert'
export default {
    base: '/TeamsMeetingExtra/app/',
    build: {
        outDir: './dist/app'
    },
    plugins: [
        mkcert()
    ],
    server: {
        https: true
    }
}
