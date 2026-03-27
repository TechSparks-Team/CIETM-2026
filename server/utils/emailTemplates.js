/**
 * CIETM 2026 Premium Email Template
 * 
 * Provides a consistent, professional design for transactional emails
 */

const getPremiumTemplate = (content, title = 'CIETM 2026') => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                margin: 0;
                padding: 0;
                background-color: #ffffff;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                color: #334155;
            }
            
            .wrapper {
                width: 100%;
                table-layout: fixed;
                background-color: #ffffff;
                padding-bottom: 40px;
            }
            
            .main {
                background-color: #ffffff;
                margin: 0 auto;
                width: 100%;
                max-width: 600px;
                border-spacing: 0;
                font-family: sans-serif;
                color: #4a4a4a;
            }
            
            .header {
                background: linear-gradient(to right, #22d3ee, #d946ef, #7c3aed);
                padding: 40px 20px;
                text-align: center;
                color: #ffffff;
            }
            
            .header h1 {
                margin: 0;
                font-size: 32px;
                font-weight: 800;
                letter-spacing: 1px;
                text-transform: uppercase;
            }
            
            .header p {
                margin: 5px 0 0;
                font-size: 12px;
                font-weight: 600;
                opacity: 0.9;
                letter-spacing: 3px;
                text-transform: uppercase;
            }
            
            .content {
                padding: 40px 20px;
                line-height: 1.6;
            }
            
            .content h2 {
                color: #1e293b;
                font-size: 22px;
                font-weight: 700;
                margin-top: 0;
                margin-bottom: 20px;
            }
            
            .button-container {
                text-align: center;
                margin: 30px 0;
            }
            
            .button {
                display: inline-block;
                background-color: #1e1b4b;
                color: #ffffff !important;
                padding: 15px 35px;
                text-decoration: none;
                font-weight: 700;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .remarks-box {
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                padding: 20px;
                margin: 20px 0;
            }
            
            .remarks-box h4 {
                margin: 0 0 10px;
                font-size: 11px;
                color: #64748b;
                text-transform: uppercase;
            }
            
            .otp-box {
                background-color: #f8fafc;
                border: 2px dashed #cbd5e1;
                padding: 30px;
                text-align: center;
                margin: 30px 0;
            }
            
            .otp-code {
                font-size: 36px;
                font-weight: 800;
                color: #1e1b4b;
                letter-spacing: 10px;
                margin: 0;
            }
            
            .footer {
                padding: 30px 20px;
                text-align: center;
                background-color: #f1f5f9;
                color: #94a3b8;
                font-size: 12px;
            }
            
            .footer p {
                margin: 5px 0;
            }
            
            .tag {
                display: inline-block;
                padding: 5px 12px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                margin-bottom: 15px;
            }
            
            .tag-success { background-color: #d1fae5; color: #065f46; }
            .tag-error { background-color: #fee2e2; color: #991b1b; }
            .tag-info { background-color: #dbeafe; color: #1e40af; }
        </style>
    </head>
    <body>
        <center class="wrapper">
            <table class="main" width="100%">
                <tr>
                    <td class="header">
                        <h1>CIETM 2026</h1>
                        <p>Contemporary Innovations in Engineering, Technology & Management</p>
                    </td>
                </tr>
                <tr>
                    <td class="content">
                        ${content}
                    </td>
                </tr>
                <tr>
                    <td class="footer">
                        <p>&copy; 2026 CIETM Conference Committee</p>
                        <p>Coimbatore Institute of Engineering and Technology</p>
                    </td>
                </tr>
            </table>
        </center>
    </body>
    </html>
    `;
};

module.exports = { getPremiumTemplate };
