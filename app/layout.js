import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import Cart from "@/components/Cart";
import MenuDrawer from "@/components/MenuDrawer";
import BottomBar from "@/components/BottomBar";

export const metadata = {
  title: "Tienda Gloss - Cosmética, Cuidado Facial & Belleza Capilar",
  description: "Descubre nuestra selección premium de productos para el cuidado capilar, facial y cosméticos. Compra rápida por WhatsApp.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <CartProvider>
          {/* Contenedor principal que centra el e-commerce en pantallas de PC */}
          <div style={styles.appContainer}>
            <main style={styles.mainContent}>
              {children}
            </main>
            
            {/* Componentes globales */}
            <Cart />
            <MenuDrawer />
            <BottomBar />
          </div>
        </CartProvider>
      </body>
    </html>
  );
}

const styles = {
  appContainer: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-primary)',
  },
  mainContent: {
    flex: 1,
    paddingBottom: '56px', // Espacio para que el BottomBar móvil compacto no tape el contenido
    display: 'flex',
    flexDirection: 'column',
  }
};

