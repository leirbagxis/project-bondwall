import prisma from "../prisma/client.js"

export const saveReportService = async (reportData) => {
    try {
        const newReport = await prisma.denuncia.create({
            data: {
                denuncianteId: String(reportData.denuncianteId),
                denunciadoId: String(reportData.denunciadoId),
                tipo: reportData.tipo,
                descricao: reportData.descricao,
                grupo: reportData.grupo
            }
        })

        if (!newReport) {
            throw new Error('Failed to create report');
        }
        return newReport;

    } catch (error) {
        console.error('Error saving report:', error);
        throw new Error('Failed to save report');
    }
}

export const updateResultReportService = async (reportId, result) => {
    
}