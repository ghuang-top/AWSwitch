# AWS服务器IP管理工具

这是一个用于管理AWS服务器IP地址的工具，提供Web界面来管理AWS凭证、EC2实例和弹性IP。

## 功能

- AWS凭证管理
  - 添加、查看和删除AWS访问凭证
  - 支持多组凭证管理
  - 安全存储敏感信息

- EC2实例管理
  - 查看EC2实例列表和详情
  - 查看实例IP配置

- 弹性IP管理
  - 分配新的弹性IP
  - 关联弹性IP到实例
  - 解除弹性IP关联
  - 释放弹性IP

## 部署方法

### 使用Docker Compose（推荐）

1. 克隆此仓库：
   ```bash
   git clone https://github.com/yourusername/aws-ip-manager.git
   cd aws-ip-manager
   ```

2. 使用Docker Compose启动服务：
   ```bash
   docker-compose up -d
   ```

3. 访问Web界面：
   ```
   http://yourserver:8080
   ```

### 手动构建

1. 构建Docker镜像：
   ```bash
   docker build -t aws-ip-manager .
   ```

2. 运行容器：
   ```bash
   docker run -d --name aws-ip-manager \
     -p 8080:8080 \
     -v aws-ip-data:/data \
     aws-ip-manager
   ```

## 使用说明

### 1. 添加AWS凭证

1. 访问Web界面，默认显示"凭证管理"页面
2. 点击"添加凭证"按钮
3. 填写凭证信息：
   - 凭证名称：用于标识此凭证的名称
   - 访问密钥ID (Access Key)：AWS访问密钥ID
   - 秘密访问密钥 (Secret Key)：AWS秘密访问密钥
   - AWS区域：选择AWS区域
4. 点击"保存"按钮

### 2. 管理EC2实例

1. 点击导航栏中的"实例管理"
2. 从下拉菜单中选择一个AWS凭证
3. 系统将显示该凭证对应区域中的EC2实例列表
4. 可以查看实例详情或关联弹性IP

### 3. 管理弹性IP

1. 点击导航栏中的"弹性IP管理"
2. 从下拉菜单中选择一个AWS凭证
3. 系统将显示该凭证对应区域中的弹性IP列表
4. 可以执行以下操作：
   - 分配新的弹性IP
   - 解除弹性IP关联
   - 释放弹性IP

## 安全注意事项

- AWS凭证信息在存储前会经过加密处理
- 建议使用具有最小权限的IAM用户创建访问密钥
- 需要的IAM权限：EC2相关（DescribeInstances, AllocateAddress, ReleaseAddress, AssociateAddress, DisassociateAddress, DescribeAddresses）

## 配置选项

可以修改`config.json`文件来自定义配置：

```json
{
  "port": "8080",            // HTTP服务端口
  "log_path": "/data/aws-ip-manager.log",  // 日志文件路径
  "credentials_db": "/data/credentials.db", // 凭证数据库文件路径
  "use_https": false,        // 是否使用HTTPS
  "cert_file": "",           // SSL证书文件路径（当use_https为true时）
  "key_file": ""             // SSL密钥文件路径（当use_https为true时）
}
```

## 开发指南

如果您想贡献代码或进行定制开发，请参考以下步骤：

1. 后端API扩展:
   - 在`backend/services`中添加新的AWS服务交互功能
   - 在`backend/handlers`中添加新的HTTP处理函数
   - 在`main.go`中注册新的路由

2. 前端界面扩展:
   - 修改`frontend/index.html`添加新的UI元素
   - 在`frontend/js/main.js`中添加相应的处理逻辑

## 许可证

MIT 