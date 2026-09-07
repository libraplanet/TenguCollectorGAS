const { execSync } = require('child_process');

const deploymentId = process.env.DEPLOYMENT_ID;
const description = process.env.DESCRIPTION;

let hasError = false;

if (!deploymentId) {
    console.error('エラー: DEPLOYMENT_ID が環境変数に設定されていません。');
    hasError = true;
}
if (!description) {
    console.error('エラー: DESCRIPTION が環境変数に設定されていません。');
    hasError = true;
}
if (hasError) {
    process.exit(1);
} else {
    try {
        const command = `npx clasp deploy -i ${deploymentId} -d "${description}"`;
        console.log(`${command}`);
        execSync(command, { stdio: 'inherit' });
        console.log('デプロイが正常に完了しました。');
    } catch (error) {
        console.error('デプロイ実行中にエラーが発生しました:', error.message);
        process.exit(1);
    }
}
