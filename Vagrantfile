# -*- mode: ruby -*-
# vi: set ft=ruby :
# rubocop:disable Metrics/BlockLength

#
# defines VMs for testing NAD and building NAD omnibus packages
#

# extract node version to use from common place
node_ver = File.read('.node_version').strip

#
# this links up these VMs with a local cosi-site for testing
#
# !!! IMPORTANT !!! -- NOT REQUIRED for NAD plugin development
#
# git clone https://github.com/circonus-labs/circonus-one-step-install
# cd src && make package # !! NOTE !! build requirements in cosi's readme...
# cd ../demo && vagrant up site
# each VM below will add an alias to /etc/hosts for 'cosi-site'
# (use http://cosi-site/install ... --cosiurl http://cosi-site/)
cosi_site_ip = '192.168.100.10'

Vagrant.configure('2') do |config|
    config.vm.define 'c7', autostart: false do |c7|
        c7.vm.box = 'maier/centos-7.3.1611-x86_64'
        c7.vm.provider 'virtualbox' do |vb|
            vb.name = 'c7'
        end
        c7.vm.network 'private_network', ip: '192.168.100.202'
        c7.vm.provision 'shell', inline: <<-SHELL
            echo "#{cosi_site_ip} cosi-site" >> /etc/hosts
            yum -q -e 0 makecache fast
            echo "Installing needed packages for 'make install' and 'make install-rhel'"
            yum -q install -y rsync gcc
            echo "Installing needed packages for 'packaging/make-omnibus'"
            yum -q install -y git wget rpm-build redhat-rpm-config
            mkdir -p /mnt/node-agent/packages
            chown -R vagrant:vagrant /mnt/node-agent
            node_tgz="node-#{node_ver}-linux-x64.tar.gz"
            [[ -f /vagrant/${node_tgz} ]] || {
                echo "Fetching $node_tgz"
                curl -sSL "https://nodejs.org/dist/#{node_ver}/${node_tgz}" -o /vagrant/$node_tgz
            }
            [[ -x /opt/circonus/bin/node ]] || {
                echo "Installing $node_tgz"
                [[ -d /opt/circonus ]] || mkdir -p /opt/circonus
                tar --strip-components=1 -zxf /vagrant/$node_tgz -C /opt/circonus
            }
        SHELL
    end

    config.vm.define 'c6', autostart: false do |c6|
        c6.vm.box = 'maier/centos-6.8-x86_64'
        c6.vm.provider 'virtualbox' do |vb|
            vb.name = 'c6'
        end
        c6.vm.network 'private_network', ip: '192.168.100.201'
        c6.vm.provision 'shell', inline: <<-SHELL
            echo "#{cosi_site_ip} cosi-site" >> /etc/hosts
            yum -q -e 0 makecache fast
            echo "Installing needed packages for 'make install' and 'make install-rhel'"
            yum -q install -y rsync gcc
            echo "Installing needed packages for 'packaging/make-omnibus'"
            yum -q install -y git wget rpm-build redhat-rpm-config
            mkdir -p /mnt/node-agent/packages
            chown -R vagrant:vagrant /mnt/node-agent
            node_tgz="node-#{node_ver}-linux-x64.tar.gz"
            [[ -f /vagrant/${node_tgz} ]] || {
                echo "Fetching $node_tgz"
                curl -sSL "https://nodejs.org/dist/#{node_ver}/${node_tgz}" -o /vagrant/$node_tgz
            }
            [[ -x /opt/circonus/bin/node ]] || {
                echo "Installing $node_tgz"
                [[ -d /opt/circonus ]] || mkdir -p /opt/circonus
                tar --strip-components=1 -zxf /vagrant/$node_tgz -C /opt/circonus
            }
        SHELL
    end

    config.vm.define 'u16', autostart: false do |u16|
        u16.vm.box = 'maier/ubuntu-16.04-x86_64'
        # prevent 'mesg: ttyname failed: Inappropriate ioctl for device' errors
        u16.ssh.shell = "bash -c 'BASH_ENV=/etc/profile exec bash'"
        u16.vm.provider 'virtualbox' do |vb|
            vb.name = 'u16'
        end
        u16.vm.network 'private_network', ip: '192.168.100.212'
        u16.vm.provision 'shell', inline: <<-SHELL
            echo "#{cosi_site_ip} cosi-site" >> /etc/hosts
            apt-get update -qq
            echo "Installing needed packages for 'make install' and 'make install-ubuntu'"
            apt-get install -qq gcc
            echo "Installing needed packages for 'packaging/make-omnibus'"
            apt-get install -qq git build-essential checkinstall python ruby ruby-dev
            gem install fpm
            mkdir -p /mnt/node-agent/packages
            chown -R vagrant:vagrant /mnt/node-agent
            node_tgz="node-#{node_ver}-linux-x64.tar.gz"
            [[ -f /vagrant/${node_tgz} ]] || {
                echo "Fetching $node_tgz"
                curl -sSL "https://nodejs.org/dist/#{node_ver}/${node_tgz}" -o /vagrant/$node_tgz
            }
            [[ -x /opt/circonus/bin/node ]] || {
                echo "Installing $node_tgz"
                [[ -d /opt/circonus ]] || mkdir -p /opt/circonus
                tar --strip-components=1 -zxf /vagrant/$node_tgz -C /opt/circonus
            }
        SHELL
    end

    config.vm.define 'u14', autostart: false do |u14|
        u14.vm.box = 'maier/ubuntu-14.04-x86_64'
        # prevent 'mesg: ttyname failed: Inappropriate ioctl for device' errors
        u14.ssh.shell = "bash -c 'BASH_ENV=/etc/profile exec bash'"
        u14.vm.provider 'virtualbox' do |vb|
            vb.name = 'u14'
        end
        u14.vm.network 'private_network', ip: '192.168.100.211'
        u14.vm.provision 'shell', inline: <<-SHELL
            echo "#{cosi_site_ip} cosi-site" >> /etc/hosts
            apt-get update -qq
            echo "Installing needed packages for 'make install' and 'make install-ubuntu'"
            apt-get install -qq gcc
            echo "Installing needed packages for 'packaging/make-omnibus'"
            apt-get install -qq git build-essential checkinstall python ruby ruby-dev
            gem install fpm
            mkdir -p /mnt/node-agent/packages
            chown -R vagrant:vagrant /mnt/node-agent
            node_tgz="node-#{node_ver}-linux-x64.tar.gz"
            [[ -f /vagrant/${node_tgz} ]] || {
                echo "Fetching $node_tgz"
                curl -sSL "https://nodejs.org/dist/#{node_ver}/${node_tgz}" -o /vagrant/$node_tgz
            }
            [[ -x /opt/circonus/bin/node ]] || {
                echo "Installing $node_tgz"
                [[ -d /opt/circonus ]] || mkdir -p /opt/circonus
                tar --strip-components=1 -zxf /vagrant/$node_tgz -C /opt/circonus
            }
        SHELL
    end

    config.vm.define 'o14', autostart: false do |o14|
        o14.vm.box = 'maier/omnios-r151014-x86_64'
        o14.vm.provider 'virtualbox' do |vb|
            vb.name = 'o14'
        end
        o14.vm.network 'private_network', ip: '192.168.100.221'
        o14.vm.provision 'shell', inline: <<-SHELL
            echo "#{cosi_site_ip} cosi-site" >> /etc/hosts
            echo "Installing needed packages for 'make install' and 'make install-illumos'"
            pkg set-publisher -g http://updates.circonus.net/omnios/r151014/ circonus
            pkg install -q platform/runtime/nodejs network/rsync developer/gcc48
            [[ $(grep -c "PATH" /root/.bashrc) -eq 0  ]] && {
                echo '[[ -f ~/.bashrc ]] && source ~/.bashrc' >> /root/.profile
                echo 'export PATH="$PATH:$(ls -d /opt/gcc*)/bin"' >> /root/.bashrc
            }
        SHELL
    end

    config.vm.define 'bsd11', autostart: false do |bsd11|
        bsd11.vm.guest = :freebsd
        bsd11.vm.box = 'freebsd/FreeBSD-11.0-RELEASE-p1'
        bsd11.vm.synced_folder '.', '/vagrant', id: 'vagrant-root', disabled: true
        bsd11.vm.synced_folder '.', '/vagrant', type: 'nfs'
        # mac not set in base box, just needs to be set to something to avoid vagrant errors
        bsd11.vm.base_mac = ''
        bsd11.ssh.shell = 'sh'
        bsd11.vm.provider 'virtualbox' do |vb|
            vb.name = 'bsd11'
            vb.customize ['modifyvm', :id, '--memory', '2048']
            vb.customize ['modifyvm', :id, '--cpus', '2']
            vb.customize ['modifyvm', :id, '--hwvirtex', 'on']
            vb.customize ['modifyvm', :id, '--audio', 'none']
            vb.customize ['modifyvm', :id, '--nictype1', 'virtio']
            vb.customize ['modifyvm', :id, '--nictype2', 'virtio']
        end
        bsd11.vm.network 'private_network', ip: '192.168.100.232'
        bsd11.vm.provision 'shell', inline: <<-SHELL
            echo "#{cosi_site_ip} cosi-site" >> /etc/hosts
            echo "Installing needed packages for 'make install' and 'make install-freebsd'"
            pkg install -y -q gcc node npm gmake bash logrotate curl
            if [ $(grep -c fdescfs /etc/fstab) -eq 0 ]; then
                mount -t fdescfs fdescfs /dev/fd
                echo 'fdescfs	/dev/fd		fdescfs		rw,late	0	0' >> /etc/fstab
            fi
        SHELL
    end

    config.vm.define 'bsd10', autostart: false do |bsd10|
        bsd10.vm.guest = :freebsd
        bsd10.vm.box = 'freebsd/FreeBSD-10.3-RELEASE'
        bsd10.vm.synced_folder '.', '/vagrant', id: 'vagrant-root', disabled: true
        bsd10.vm.synced_folder '.', '/vagrant', type: 'nfs'
        # mac not set in base box, just needs to be set to something to avoid vagrant errors
        bsd10.vm.base_mac = ''
        bsd10.ssh.shell = 'sh'
        bsd10.vm.provider 'virtualbox' do |vb|
            vb.name = 'bsd10'
            vb.customize ['modifyvm', :id, '--memory', '2048']
            vb.customize ['modifyvm', :id, '--cpus', '2']
            vb.customize ['modifyvm', :id, '--hwvirtex', 'on']
            vb.customize ['modifyvm', :id, '--audio', 'none']
            vb.customize ['modifyvm', :id, '--nictype1', 'virtio']
            vb.customize ['modifyvm', :id, '--nictype2', 'virtio']
        end
        bsd10.vm.network 'private_network', ip: '192.168.100.231'
        bsd10.vm.provision 'shell', inline: <<-SHELL
            echo "#{cosi_site_ip} cosi-site" >> /etc/hosts
            echo "Installing needed packages for 'make install' and 'make install-freebsd'"
            pkg install -y -q gcc node npm gmake bash logrotate curl
            if [ $(grep -c fdescfs /etc/fstab) -eq 0 ]; then
                mount -t fdescfs fdescfs /dev/fd
                echo 'fdescfs	/dev/fd		fdescfs		rw,late	0	0' >> /etc/fstab
            fi
        SHELL
    end
end
