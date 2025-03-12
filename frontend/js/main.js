// API基础URL
const API_BASE_URL = '/api';

// 全局变量
let currentCredentialId = '';
let instancesData = [];
let eipsData = [];

// DOM加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 初始化导航点击事件
    setupNavigation();
    
    // 加载凭证数据
    loadCredentials();
    
    // 设置事件监听器
    setupEventListeners();
});

// 设置导航切换
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // 移除所有active类
            navLinks.forEach(l => l.classList.remove('active'));
            
            // 添加当前项的active类
            link.classList.add('active');
            
            // 隐藏所有section
            sections.forEach(section => section.classList.add('d-none'));
            
            // 显示当前section
            const targetId = link.id.replace('nav-', '') + '-section';
            document.getElementById(targetId).classList.remove('d-none');
            
            // 如果切换到实例或弹性IP页面，更新凭证下拉菜单
            if (targetId === 'instances-section' || targetId === 'eips-section') {
                updateCredentialDropdowns();
            }
        });
    });
}

// 设置事件监听器
function setupEventListeners() {
    // 添加凭证按钮点击事件
    document.getElementById('save-credential-btn').addEventListener('click', addCredential);
    
    // 凭证选择器变化时加载实例
    document.getElementById('credential-select').addEventListener('change', (e) => {
        currentCredentialId = e.target.value;
        if (currentCredentialId) {
            loadInstances(currentCredentialId);
        } else {
            document.querySelector('#instances-table tbody').innerHTML = '';
        }
    });
    
    // 弹性IP凭证选择器变化时加载弹性IP
    document.getElementById('eip-credential-select').addEventListener('change', (e) => {
        const credId = e.target.value;
        if (credId) {
            loadElasticIPs(credId);
        } else {
            document.querySelector('#eips-table tbody').innerHTML = '';
        }
    });
    
    // 分配弹性IP按钮点击事件
    document.getElementById('allocate-eip-btn').addEventListener('click', () => {
        const credId = document.getElementById('eip-credential-select').value;
        if (credId) {
            allocateElasticIP(credId);
        } else {
            showAlert('请先选择AWS凭证', 'danger');
        }
    });
    
    // 关联弹性IP按钮点击事件
    document.getElementById('associate-eip-btn').addEventListener('click', () => {
        const instanceId = document.getElementById('instance-id-for-eip').value;
        const eipId = document.getElementById('eip-select').value;
        const credId = currentCredentialId;
        
        if (instanceId && eipId && credId) {
            associateElasticIP(credId, instanceId, eipId);
        } else {
            showAlert('请选择有效的实例和弹性IP', 'danger');
        }
    });
}

// 加载凭证列表
async function loadCredentials() {
    try {
        const response = await fetch(`${API_BASE_URL}/credentials`);
        const data = await response.json();
        
        if (data.credentials) {
            renderCredentialsTable(data.credentials);
        }
    } catch (error) {
        console.error('加载凭证失败:', error);
        showAlert('加载凭证失败：' + error.message, 'danger');
    }
}

// 渲染凭证表格
function renderCredentialsTable(credentials) {
    const tbody = document.querySelector('#credentials-table tbody');
    tbody.innerHTML = '';
    
    if (credentials.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">暂无凭证数据</td></tr>`;
        return;
    }
    
    credentials.forEach(cred => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${cred.name}</td>
            <td>${cred.access_key}</td>
            <td>${cred.region}</td>
            <td>${new Date(cred.created_at).toLocaleString()}</td>
            <td>
                <button class="btn btn-sm btn-danger delete-cred-btn" data-id="${cred.id}">删除</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // 添加删除按钮事件
    document.querySelectorAll('.delete-cred-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const credId = e.target.getAttribute('data-id');
            if (confirm('确定要删除此凭证吗？')) {
                deleteCredential(credId);
            }
        });
    });
    
    // 更新凭证下拉菜单
    updateCredentialDropdowns();
}

// 更新凭证下拉菜单
function updateCredentialDropdowns() {
    const credentialSelect = document.getElementById('credential-select');
    const eipCredentialSelect = document.getElementById('eip-credential-select');
    
    fetch(`${API_BASE_URL}/credentials`)
        .then(response => response.json())
        .then(data => {
            const credentials = data.credentials || [];
            
            // 清空下拉菜单
            credentialSelect.innerHTML = '<option value="">请选择AWS凭证</option>';
            eipCredentialSelect.innerHTML = '<option value="">请选择AWS凭证</option>';
            
            // 添加选项
            credentials.forEach(cred => {
                const option = document.createElement('option');
                option.value = cred.id;
                option.textContent = cred.name;
                
                const eipOption = option.cloneNode(true);
                
                credentialSelect.appendChild(option);
                eipCredentialSelect.appendChild(eipOption);
            });
        })
        .catch(error => {
            console.error('更新凭证下拉菜单失败:', error);
        });
}

// 加载弹性IP列表
async function loadElasticIPs(credId) {
    try {
        // 显示加载中
        document.querySelector('#eips-table tbody').innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    <div class="loading-spinner"></div> 正在加载弹性IP数据...
                </td>
            </tr>
        `;
        
        const response = await fetch(`${API_BASE_URL}/elastic-ips?credential_id=${credId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP错误 ${response.status}`);
        }
        
        const data = await response.json();
        eipsData = data.elastic_ips || [];
        
        renderElasticIPsTable(eipsData);
    } catch (error) {
        console.error('加载弹性IP失败:', error);
        document.querySelector('#eips-table tbody').innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    加载弹性IP失败：${error.message}
                </td>
            </tr>
        `;
    }
}

// 渲染弹性IP表格
function renderElasticIPsTable(eips) {
    const tbody = document.querySelector('#eips-table tbody');
    tbody.innerHTML = '';
    
    if (eips.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">没有找到弹性IP</td></tr>`;
        return;
    }
    
    eips.forEach(eip => {
        const status = eip.AssociationId ? '已关联' : '未关联';
        const instanceId = eip.InstanceId || '无';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${eip.PublicIp}</td>
            <td>${eip.AllocationId}</td>
            <td>${instanceId}</td>
            <td>${status}</td>
            <td>
                ${eip.AssociationId 
                    ? `<button class="btn btn-sm btn-warning disassociate-eip-btn" 
                         data-allocation-id="${eip.AllocationId}" 
                         data-association-id="${eip.AssociationId}">解除关联</button>` 
                    : ''}
                <button class="btn btn-sm btn-danger release-eip-btn" 
                        data-allocation-id="${eip.AllocationId}">释放</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // 添加解除关联按钮事件
    document.querySelectorAll('.disassociate-eip-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const allocationId = e.target.getAttribute('data-allocation-id');
            const associationId = e.target.getAttribute('data-association-id');
            
            if (confirm('确定要解除此弹性IP的关联吗？')) {
                disassociateElasticIP(document.getElementById('eip-credential-select').value, associationId);
            }
        });
    });
    
    // 添加释放按钮事件
    document.querySelectorAll('.release-eip-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const allocationId = e.target.getAttribute('data-allocation-id');
            
            if (confirm('确定要释放此弹性IP吗？此操作无法撤销。')) {
                releaseElasticIP(document.getElementById('eip-credential-select').value, allocationId);
            }
        });
    });
}

// 分配新的弹性IP
async function allocateElasticIP(credId) {
    try {
        const response = await fetch(`${API_BASE_URL}/instances/allocate-eip?credential_id=${credId}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误 ${response.status}`);
        }
        
        // 重新加载弹性IP列表
        loadElasticIPs(credId);
        
        showAlert('弹性IP分配成功', 'success');
    } catch (error) {
        console.error('分配弹性IP失败:', error);
        showAlert('分配弹性IP失败：' + error.message, 'danger');
    }
}

// 解除弹性IP关联
async function disassociateElasticIP(credId, associationId) {
    try {
        const response = await fetch(`${API_BASE_URL}/instances/disassociate-eip`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                credential_id: credId,
                association_id: associationId
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误 ${response.status}`);
        }
        
        // 重新加载弹性IP列表
        loadElasticIPs(credId);
        
        showAlert('弹性IP关联已解除', 'success');
    } catch (error) {
        console.error('解除弹性IP关联失败:', error);
        showAlert('解除弹性IP关联失败：' + error.message, 'danger');
    }
}

// 释放弹性IP
async function releaseElasticIP(credId, allocationId) {
    try {
        const response = await fetch(`${API_BASE_URL}/instances/release-eip`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                credential_id: credId,
                allocation_id: allocationId
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误 ${response.status}`);
        }
        
        // 重新加载弹性IP列表
        loadElasticIPs(credId);
        
        showAlert('弹性IP已释放', 'success');
    } catch (error) {
        console.error('释放弹性IP失败:', error);
        showAlert('释放弹性IP失败：' + error.message, 'danger');
    }
}

// 显示提示消息
function showAlert(message, type) {
    // 创建alert容器
    let alertContainer = document.querySelector('.alert-container');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.className = 'alert-container';
        document.body.appendChild(alertContainer);
    }
    
    // 创建alert元素
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show fade-alert`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // 添加到容器
    alertContainer.appendChild(alert);
    
    // 自动关闭
    setTimeout(() => {
        if (alert) {
            alert.remove();
        }
    }, 5000);
}

// 添加凭证
async function addCredential() {
    const name = document.getElementById('credential-name').value;
    const accessKey = document.getElementById('access-key').value;
    const secretKey = document.getElementById('secret-key').value;
    const region = document.getElementById('region').value;
    
    if (!name || !accessKey || !secretKey || !region) {
        showAlert('请填写所有必填字段', 'danger');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/credentials`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                access_key: accessKey,
                secret_key: secretKey,
                region
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误 ${response.status}`);
        }
        
        const data = await response.json();
        
        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('addCredentialModal'));
        modal.hide();
        
        // 清空表单
        document.getElementById('add-credential-form').reset();
        
        // 重新加载凭证列表
        loadCredentials();
        
        showAlert('凭证添加成功', 'success');
    } catch (error) {
        console.error('添加凭证失败:', error);
        showAlert('添加凭证失败：' + error.message, 'danger');
    }
}

// 删除凭证
async function deleteCredential(credId) {
    try {
        const response = await fetch(`${API_BASE_URL}/credentials/${credId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误 ${response.status}`);
        }
        
        // 重新加载凭证列表
        loadCredentials();
        
        showAlert('凭证删除成功', 'success');
    } catch (error) {
        console.error('删除凭证失败:', error);
        showAlert('删除凭证失败：' + error.message, 'danger');
    }
}

// 加载实例列表
async function loadInstances(credId) {
    if (!credId) return;
    
    try {
        // 显示加载中
        document.querySelector('#instances-table tbody').innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="loading-spinner"></div> 正在加载实例数据...
                </td>
            </tr>
        `;
        
        const response = await fetch(`${API_BASE_URL}/instances?credential_id=${credId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP错误 ${response.status}`);
        }
        
        const data = await response.json();
        instancesData = data.instances || [];
        
        renderInstancesTable(instancesData);
    } catch (error) {
        console.error('加载实例失败:', error);
        document.querySelector('#instances-table tbody').innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    加载实例失败：${error.message}
                </td>
            </tr>
        `;
    }
}

// 渲染实例表格
function renderInstancesTable(instances) {
    const tbody = document.querySelector('#instances-table tbody');
    tbody.innerHTML = '';
    
    if (instances.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">没有找到EC2实例</td></tr>`;
        return;
    }
    
    instances.forEach(instance => {
        const publicIp = instance.PublicIpAddress || '无';
        const privateIp = instance.PrivateIpAddress || '无';
        const state = instance.State ? instance.State.Name : '未知';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${instance.InstanceId}</td>
            <td>${instance.InstanceType}</td>
            <td>
                <span class="badge bg-${getStateColor(state)}">${state}</span>
            </td>
            <td>${publicIp}</td>
            <td>${privateIp}</td>
            <td>
                <button class="btn btn-sm btn-info view-instance-btn" data-id="${instance.InstanceId}">详情</button>
                <button class="btn btn-sm btn-primary associate-ip-btn" data-id="${instance.InstanceId}">关联IP</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // 添加详情按钮事件
    document.querySelectorAll('.view-instance-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const instanceId = e.target.getAttribute('data-id');
            showInstanceDetails(instanceId);
        });
    });
    
    // 添加关联IP按钮事件
    document.querySelectorAll('.associate-ip-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const instanceId = e.target.getAttribute('data-id');
            showAssociateEipModal(instanceId);
        });
    });
}

// 根据实例状态获取颜色
function getStateColor(state) {
    switch (state) {
        case 'running': return 'success';
        case 'stopped': return 'danger';
        case 'pending': return 'warning';
        case 'stopping': return 'warning';
        case 'terminated': return 'secondary';
        default: return 'secondary';
    }
}

// 显示实例详情
async function showInstanceDetails(instanceId) {
    try {
        const response = await fetch(`${API_BASE_URL}/instances/${instanceId}?credential_id=${currentCredentialId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP错误 ${response.status}`);
        }
        
        const data = await response.json();
        const instance = data.instance;
        
        const detailsBody = document.getElementById('instance-details-body');
        detailsBody.innerHTML = `
            <div class="table-responsive">
                <table class="table table-bordered">
                    <tr>
                        <th>实例ID</th>
                        <td>${instance.InstanceId}</td>
                    </tr>
                    <tr>
                        <th>实例类型</th>
                        <td>${instance.InstanceType}</td>
                    </tr>
                    <tr>
                        <th>状态</th>
                        <td><span class="badge bg-${getStateColor(instance.State.Name)}">${instance.State.Name}</span></td>
                    </tr>
                    <tr>
                        <th>公网IP</th>
                        <td>${instance.PublicIpAddress || '无'}</td>
                    </tr>
                    <tr>
                        <th>私网IP</th>
                        <td>${instance.PrivateIpAddress || '无'}</td>
                    </tr>
                    <tr>
                        <th>可用区</th>
                        <td>${instance.Placement.AvailabilityZone}</td>
                    </tr>
                    <tr>
                        <th>启动时间</th>
                        <td>${new Date(instance.LaunchTime).toLocaleString()}</td>
                    </tr>
                    <tr>
                        <th>安全组</th>
                        <td>
                            ${instance.SecurityGroups.map(sg => `${sg.GroupName} (${sg.GroupId})`).join('<br>')}
                        </td>
                    </tr>
                    <tr>
                        <th>标签</th>
                        <td>
                            ${instance.Tags && instance.Tags.length > 0 
                                ? instance.Tags.map(tag => `${tag.Key}: ${tag.Value}`).join('<br>')
                                : '无'}
                        </td>
                    </tr>
                </table>
            </div>
        `;
        
        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('instanceDetailsModal'));
        modal.show();
    } catch (error) {
        console.error('获取实例详情失败:', error);
        showAlert('获取实例详情失败：' + error.message, 'danger');
    }
}

// 显示关联弹性IP模态框
async function showAssociateEipModal(instanceId) {
    document.getElementById('instance-id-for-eip').value = instanceId;
    
    try {
        // 获取可用的弹性IP
        await loadAvailableEIPs(currentCredentialId);
        
        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('associateEipModal'));
        modal.show();
    } catch (error) {
        console.error('获取可用弹性IP失败:', error);
        showAlert('获取可用弹性IP失败：' + error.message, 'danger');
    }
}

// 加载可用的弹性IP
async function loadAvailableEIPs(credId) {
    try {
        const response = await fetch(`${API_BASE_URL}/elastic-ips?credential_id=${credId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP错误 ${response.status}`);
        }
        
        const data = await response.json();
        const eips = data.elastic_ips || [];
        
        // 过滤出未关联的弹性IP
        const availableEips = eips.filter(eip => !eip.InstanceId);
        
        const select = document.getElementById('eip-select');
        select.innerHTML = '';
        
        if (availableEips.length === 0) {
            select.innerHTML = '<option value="">没有可用的弹性IP</option>';
            return;
        }
        
        availableEips.forEach(eip => {
            const option = document.createElement('option');
            option.value = eip.AllocationId;
            option.textContent = `${eip.PublicIp} (${eip.AllocationId})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('加载可用弹性IP失败:', error);
        throw error;
    }
}

// 关联弹性IP到实例
async function associateElasticIP(credId, instanceId, allocationId) {
    try {
        const response = await fetch(`${API_BASE_URL}/instances/${instanceId}/associate-eip`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                credential_id: credId,
                allocation_id: allocationId
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误 ${response.status}`);
        }
        
        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('associateEipModal'));
        modal.hide();
        
        // 重新加载实例列表
        loadInstances(credId);
        
        showAlert('弹性IP关联成功', 'success');
    } catch (error) {
        console.error('关联弹性IP失败:', error);
        showAlert('关联弹性IP失败：' + error.message, 'danger');
    }
} 