import sql from 'mssql';

/**
 * Utilidades centralizadas para la integración de Tienda Gloss con Navasoft ERP
 */

export const ERP_CONFIG = {
    TAX_RATE: 1.18,
    DEFAULT_WAREHOUSE: process.env.ERP_DEFAULT_WAREHOUSE || '01',
    DEFAULT_SEDE: process.env.ERP_DEFAULT_SEDE || '01'
};

/**
 * Resuelve el almacén (codalm) asignado a una sede (codpto)
 */
export async function getWarehouseForSede(pool, sedeId) {
    const cleanSedeId = (sedeId || '').toString().trim();
    if (!cleanSedeId) return ERP_CONFIG.DEFAULT_WAREHOUSE;
    
    try {
        const ptoRes = await pool.request()
            .input('codpto', sql.VarChar(10), cleanSedeId)
            .query("SELECT TOP 1 codtie FROM tbl01pto WHERE LTRIM(RTRIM(codpto)) = @codpto");
        
        if (ptoRes.recordset.length > 0) {
            const codtie = ptoRes.recordset[0].codtie.trim();
            const almRes = await pool.request()
                .input('codtie', sql.VarChar(10), codtie)
                .query(`
                    SELECT TOP 1 codalm FROM tbl01Alm 
                    WHERE LTRIM(RTRIM(codtie)) = LTRIM(RTRIM(@codtie)) 
                    ORDER BY CASE WHEN codalm = '01' THEN 1 ELSE 0 END ASC, codalm DESC
                `); 
            
            if (almRes.recordset.length > 0) {
                return almRes.recordset[0].codalm.trim();
            }
        }
    } catch (error) {
        console.error('[ERP Utils] Error resolving warehouse dynamically:', error);
    }
    return ERP_CONFIG.DEFAULT_WAREHOUSE;
}

/**
 * Retorna el nombre de la tabla de stock para un almacén dado
 */
export function getStockTableName(warehouse) {
    const formatted = (warehouse || ERP_CONFIG.DEFAULT_WAREHOUSE).padStart(2, '0');
    return `prd01${formatted}`;
}

/**
 * Retorna el nombre de la columna de stock en prd0101 para un almacén dado
 */
export function getStockColumnName(warehouse) {
    const formatted = (warehouse || ERP_CONFIG.DEFAULT_WAREHOUSE).padStart(2, '0');
    return `stk${formatted}`;
}

/**
 * Calcula el desglose de IGV para un monto total o una lista de items
 */
export function calculateTaxBreakdown(data, isTaxed = true) {
    if (!isTaxed) {
        const total = Array.isArray(data) 
            ? data.reduce((acc, i) => acc + (i.price * i.quantity), 0)
            : Number(data);
        return { total, subtotal: total, tax: 0 };
    }

    if (Array.isArray(data)) {
        return data.reduce((acc, item) => {
            const itemTotal = Number(item.price * item.quantity);
            const itemNet = itemTotal / ERP_CONFIG.TAX_RATE;
            acc.total += itemTotal;
            acc.subtotal += itemNet;
            acc.tax += (itemTotal - itemNet);
            return acc;
        }, { total: 0, subtotal: 0, tax: 0 });
    }

    const total = Number(data);
    const subtotal = total / ERP_CONFIG.TAX_RATE;
    return {
        total,
        subtotal,
        tax: total - subtotal
    };
}
