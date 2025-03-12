FROM golang:1.19-alpine AS builder

WORKDIR /app

# 复制Go模块文件
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# 复制源代码
COPY backend/ ./

# 编译
RUN CGO_ENABLED=0 GOOS=linux go build -o aws-ip-manager .

# 最终镜像
FROM alpine:3.16

WORKDIR /app

# 从构建阶段复制二进制文件
COPY --from=builder /app/aws-ip-manager .

# 复制前端文件
COPY frontend/ ./frontend/

# 创建配置文件
RUN echo '{"port":"8080","log_path":"/data/aws-ip-manager.log","credentials_db":"/data/credentials.db","use_https":false}' > config.json

# 创建数据卷
VOLUME /data

# 暴露端口
EXPOSE 8080

# 启动应用
CMD ["./aws-ip-manager"] 